const input = $input.first().json;
const componentMap = input.data || {};
const raw = input.content?.find((item) => item.type === 'text')?.text
  || input.text
  || input.output
  || '';

if (!raw) throw new Error('Figma MCP 텍스트 결과가 없습니다.');

const nodesStart = raw.indexOf('NODES:');
if (nodesStart < 0) {
  throw new Error('Figma MCP 결과에서 NODES 구간을 찾지 못했습니다.');
}

const normalize = (value) => String(value || '')
  .toLowerCase()
  .replace(/[\s_-]+/g, '');

const decode = (value) => String(value || '')
  .replace(/\\n/g, '\n')
  .replace(/\\"/g, '"')
  .replace(/\\([()[\]])/g, '$1')
  .replace(/\{ts\d+\}/g, '')
  .replace(/\{\/ts\d+\}/g, '')
  .trim();

const roots = [];
const allNodes = [];
const stack = [];

for (const line of raw.slice(nodesStart).split(/\r?\n/)) {
  const match = line.match(
    /^(\s*)\[(FRAME|INSTANCE|TEXT)\](?:\s+"([^"]*)")?/
  );

  if (!match) continue;

  const depth = Math.floor(match[1].length / 2);
  while (stack.length && stack[stack.length - 1].depth >= depth) {
    stack.pop();
  }

  const explicitName = (
    line.match(/\bname="((?:\\.|[^"])*)"/) || []
  )[1];
  const id = (
    line.match(/\bid="([^"]+)"/)
    || line.match(/\s#([^\s]+)/)
    || []
  )[1] || '';
  const text = (
    line.match(/\btext="((?:\\.|[^"])*)"/) || []
  )[1];

  const node = {
    type: match[2],
    name: decode(explicitName === undefined ? match[3] : explicitName),
    nodeId: id,
    depth,
    order: allNodes.length,
    text: text === undefined ? '' : decode(text),
    parent: stack[stack.length - 1] || null,
    children: [],
  };

  if (node.parent) node.parent.children.push(node);
  else roots.push(node);

  allNodes.push(node);
  if (node.type !== 'TEXT') stack.push(node);
}

if (!allNodes.length) {
  throw new Error('Figma 노드 구조를 파싱하지 못했습니다.');
}

const aliases = new Map();
for (const [key, definition] of Object.entries(componentMap)) {
  if (definition.type === 'layout') continue;
  for (const name of [key, ...(definition.figmaNames || [])]) {
    aliases.set(normalize(name), key);
  }
}

const getComponentKey = (node) => (
  node.type === 'TEXT' ? null : aliases.get(normalize(node.name)) || null
);

const isNestedMatch = (node) => {
  let current = node.parent;
  while (current) {
    if (getComponentKey(current)) return true;
    current = current.parent;
  }
  return false;
};

function collectTextNodes(root) {
  const output = [];

  const visit = (node) => {
    for (const child of node.children) {
      if (child !== root && getComponentKey(child)) continue;
      if (child.type === 'TEXT' && child.text) output.push(child);
      else visit(child);
    }
  };

  visit(root);
  return output;
}

const components = [];
const warnings = [];

for (const node of allNodes) {
  const key = getComponentKey(node);
  if (!key || isNestedMatch(node)) continue;

  const definition = componentMap[key] || {};
  const textNodes = collectTextNodes(node);
  const content = {};

  for (const prop of definition.props || []) content[prop] = '';

  const usedIndexes = new Set();
  for (const prop of definition.textProps || []) {
    const index = textNodes.findIndex((textNode, candidateIndex) => (
      !usedIndexes.has(candidateIndex)
      && normalize(textNode.name) === normalize(prop)
    ));

    if (index >= 0) {
      content[prop] = textNodes[index].text;
      usedIndexes.add(index);
    }
  }

  let fallbackIndex = 0;
  for (const prop of definition.textProps || []) {
    if (content[prop]) continue;
    while (usedIndexes.has(fallbackIndex)) fallbackIndex += 1;
    if (!textNodes[fallbackIndex]) continue;
    content[prop] = textNodes[fallbackIndex].text;
    usedIndexes.add(fallbackIndex);
    fallbackIndex += 1;
  }

  for (const prop of definition.requiredProps || []) {
    if (!String(content[prop] || '').trim()) {
      warnings.push(`${key}.${prop} 값 누락`);
    }
  }

  components.push({
    order: node.order,
    figmaNodeId: node.nodeId,
    figmaNode: node.name,
    component: key,
    slot: definition.slot || definition.role || 'content',
    templatePath: definition.path,
    content,
  });
}

components.sort((first, second) => first.order - second.order);

for (const [key, definition] of Object.entries(componentMap)) {
  if (definition.required !== true) continue;
  if (components.some((item) => item.component === key)) continue;

  components.push({
    order: definition.role === 'header' ? -1 : Number.MAX_SAFE_INTEGER,
    figmaNodeId: '',
    figmaNode: key,
    component: key,
    slot: definition.slot || definition.role,
    templatePath: definition.path,
    content: {},
  });
  warnings.push(`필수 컴포넌트 ${key} 자동 삽입`);
}

components.sort((first, second) => first.order - second.order);

const matchedNodeIds = new Set(
  components.map((item) => item.figmaNodeId).filter(Boolean)
);
const unmatched = [];

for (const node of allNodes) {
  if (node.type === 'TEXT' || matchedNodeIds.has(node.nodeId) || node.depth > 3) {
    continue;
  }

  const texts = collectTextNodes(node).map((item) => item.text).filter(Boolean);
  if (!texts.length) continue;
  if (node.children.some((child) => matchedNodeIds.has(child.nodeId))) continue;

  unmatched.push({
    figmaNodeId: node.nodeId,
    figmaNode: node.name || node.type,
    sampleText: texts.slice(0, 3),
  });
}

const layoutEntries = Object.entries(componentMap)
  .filter(([, definition]) => definition.type === 'layout');
const pageLayout = layoutEntries.find(([, definition]) => (
  ['header', 'content', 'footer'].every((slot) => (
    (definition.slots || []).includes(slot)
  ))
));
const contentLayout = layoutEntries.find(([, definition]) => (
  ['heading', 'content', 'actions'].every((slot) => (
    (definition.slots || []).includes(slot)
  ))
));

if (!pageLayout) {
  throw new Error('header/content/footer 슬롯을 가진 PageLayout이 없습니다.');
}

const root = roots.find((node) => node.type === 'FRAME') || roots[0];
const report = {
  status: warnings.length || unmatched.length ? 'REVIEW_REQUIRED' : 'SUCCESS',
  pageName: root?.name || 'Generated Page',
  appliedComponents: components.map((item) => ({
    figmaNode: item.figmaNode,
    component: item.component,
    order: item.order,
  })),
  unmatchedElements: unmatched,
  warnings,
};

const templateRequests = components.map((item, componentIndex) => ({
  kind: 'component',
  key: item.component,
  path: item.templatePath,
  componentIndex,
}));

templateRequests.push({
  kind: 'pageLayout',
  key: pageLayout[0],
  path: pageLayout[1].path,
});

if (contentLayout) {
  templateRequests.push({
    kind: 'contentLayout',
    key: contentLayout[0],
    path: contentLayout[1].path,
  });
}

return [{
  json: {
    pageSpec: {
      pageName: report.pageName,
      components,
      pageLayoutKey: pageLayout[0],
      contentLayoutKey: contentLayout?.[0] || null,
      report,
    },
    templateRequests,
  },
}];
