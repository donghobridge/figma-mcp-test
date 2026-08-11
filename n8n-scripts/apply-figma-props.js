const result = JSON.parse(JSON.stringify($input.first().json));
const sourceItems = $('Split Out').all();
const firstSource = sourceItems[0]?.json || {};
const componentMap = firstSource.data || {};
const figmaText = String(firstSource.figmaText || '');

if (!figmaText) {
  throw new Error('Figma 원문(figmaText)이 없습니다.');
}

const normalize = (value) => String(value || '')
  .toLowerCase()
  .replace(/[\s_-]+/g, '');

const decode = (value) => String(value || '')
  .replace(/\\n/g, '\n')
  .replace(/\\([()[\]])/g, '$1')
  .replace(/\{ts\d+\}/g, '')
  .replace(/\{\/ts\d+\}/g, '')
  .replace(/\u2028|\u2029/g, '\n')
  .trim();

const nodes = [];
const roots = [];
const stack = [];

for (const line of figmaText.split(/\r?\n/)) {
  const match = line.match(
    /^(\s*)\[(FRAME|INSTANCE|TEXT)\](?:\s+name="([^"]*)")?/
  );

  if (!match) continue;

  const depth = Math.floor(match[1].length / 2);
  while (stack.length && stack[stack.length - 1].depth >= depth) {
    stack.pop();
  }

  const id = (line.match(/\bid="([^"]+)"/) || [])[1] || '';
  const rawText = (line.match(/\btext="([\s\S]*)"\s*$/) || [])[1];
  const node = {
    type: match[2],
    name: decode(match[3] || ''),
    nodeId: id,
    depth,
    value: rawText === undefined ? '' : decode(rawText),
    parent: stack[stack.length - 1] || null,
    children: [],
  };

  if (node.parent) node.parent.children.push(node);
  else roots.push(node);

  nodes.push(node);
  if (node.type !== 'TEXT') stack.push(node);
}

const componentAliases = new Map();

for (const [component, definition] of Object.entries(componentMap)) {
  if (definition.type === 'layout') continue;

  for (const name of [component, ...(definition.figmaNames || [])]) {
    componentAliases.set(normalize(name), component);
  }
}

const componentForNode = (node) => (
  node.type === 'TEXT'
    ? null
    : componentAliases.get(normalize(node.name)) || null
);

function collectTextNodes(root) {
  const output = [];

  const visit = (node) => {
    for (const child of node.children) {
      if (child !== root && componentForNode(child)) continue;
      if (child.type === 'TEXT' && child.value) output.push(child);
      else visit(child);
    }
  };

  visit(root);
  return output;
}

function findFigmaComponentNode(item) {
  const byId = nodes.find((node) => (
    item.sourceNodeId && node.nodeId === item.sourceNodeId
  ));

  if (byId && componentForNode(byId) === item.component) return byId;

  return nodes.find((node) => componentForNode(node) === item.component) || null;
}

const warnings = Array.isArray(result.warnings) ? [...result.warnings] : [];
const mappedComponents = [];
const usedNodeIds = new Set();

for (const item of result.components || []) {
  const definition = componentMap[item.component];

  if (!definition || definition.type === 'layout') {
    warnings.push(`등록되지 않은 컴포넌트 제외: ${item.component}`);
    continue;
  }

  const props = definition.props || [];
  const content = Object.fromEntries(props.map((prop) => [prop, '']));
  const figmaNode = findFigmaComponentNode(item);

  if (figmaNode && !usedNodeIds.has(figmaNode.nodeId)) {
    usedNodeIds.add(figmaNode.nodeId);
    const textNodes = collectTextNodes(figmaNode);
    const usedTextIndexes = new Set();

    for (const prop of definition.textProps || []) {
      const aliases = [
        prop,
        ...((definition.propAliases || {})[prop] || []),
      ].map(normalize);

      const index = textNodes.findIndex((textNode, candidateIndex) => (
        !usedTextIndexes.has(candidateIndex)
        && aliases.includes(normalize(textNode.name))
      ));

      if (index >= 0) {
        content[prop] = textNodes[index].value;
        usedTextIndexes.add(index);
      }
    }

    if (definition.allowPositionalTextMapping === true) {
      let fallbackIndex = 0;

      for (const prop of definition.textProps || []) {
        if (content[prop]) continue;
        while (usedTextIndexes.has(fallbackIndex)) fallbackIndex += 1;
        if (!textNodes[fallbackIndex]) continue;
        content[prop] = textNodes[fallbackIndex].value;
        usedTextIndexes.add(fallbackIndex);
        fallbackIndex += 1;
      }
    }
  } else if (definition.props?.length) {
    warnings.push(
      `Figma 컴포넌트 이름 불일치: ${item.component} `
      + `(figmaNames: ${(definition.figmaNames || []).join(', ') || item.component})`
    );
  }

  for (const prop of definition.requiredProps || []) {
    if (!String(content[prop] || '').trim()) {
      warnings.push(`필수 값 누락: ${item.component}.${prop}`);
    }
  }

  mappedComponents.push({
    ...item,
    figmaNode: figmaNode?.name || item.figmaNode,
    sourceNodeId: figmaNode?.nodeId || item.sourceNodeId,
    content,
  });
}

for (const [component, definition] of Object.entries(componentMap)) {
  if (definition.required !== true) continue;
  if (mappedComponents.some((item) => item.component === component)) continue;

  const figmaNode = nodes.find((node) => componentForNode(node) === component);
  mappedComponents.push({
    component,
    figmaNode: figmaNode?.name || component,
    sourceNodeId: figmaNode?.nodeId || '',
    content: {},
    reason: 'component-map required 컴포넌트 자동 삽입',
  });
}

const roleOrder = (item) => {
  const definition = componentMap[item.component] || {};
  if (definition.role === 'header') return -100000;
  if (definition.role === 'footer') return 100000;
  const figmaNode = nodes.find((node) => node.nodeId === item.sourceNodeId);
  return figmaNode ? nodes.indexOf(figmaNode) : 0;
};

result.components = mappedComponents
  .sort((first, second) => roleOrder(first) - roleOrder(second))
  .map((item, index) => ({ ...item, order: index + 1 }));

result.warnings = [...new Set(warnings)];
result.mappingMode = 'component-map-driven';

return [{ json: result }];
