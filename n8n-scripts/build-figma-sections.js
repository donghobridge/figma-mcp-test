const input = $input.first().json;
const figmaText = String(input.figmaText || '');

if (!figmaText) throw new Error('figmaText가 없습니다.');

const decodeText = (value) => String(value || '')
  .replace(/\\n/g, '\n')
  .replace(/\\+\s*\n/g, '\n')
  .replace(/\\+([()[\]])/g, '$1')
  .replace(/\{ts\d+\}/g, '')
  .replace(/\{\/ts\d+\}/g, '')
  .replace(/\u2028|\u2029/g, '\n')
  .trim();

const nodes = [];
const stack = [];

for (const line of figmaText.split(/\r?\n/)) {
  const match = line.match(
    /^(\s*)\[(FRAME|INSTANCE|TEXT)\](?:\s+name="([^"]*)")?\s+id="([^"]+)"/
  );

  if (!match) continue;

  const depth = Math.floor(match[1].length / 2);
  while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();

  const rawValue = (line.match(/\btext="([\s\S]*)"\s*$/) || [])[1];
  const node = {
    type: match[2],
    name: match[3] || `${match[2]}-${match[4]}`,
    nodeId: match[4],
    depth,
    order: nodes.length,
    value: rawValue === undefined ? '' : decodeText(rawValue),
    parent: stack[stack.length - 1] || null,
    children: [],
  };

  if (node.parent) node.parent.children.push(node);
  nodes.push(node);
  if (node.type !== 'TEXT') stack.push(node);
}

if (!nodes.length) throw new Error('Figma 노드를 추출하지 못했습니다.');

function collectTextNodes(root) {
  const output = [];

  const visit = (node) => {
    for (const child of node.children) {
      if (child.type === 'TEXT') {
        if (child.value) {
          output.push({
            nodeId: child.nodeId,
            parentNodeId: child.parent?.nodeId || null,
            name: child.name,
            text: child.value,
            order: child.order,
          });
        }
      } else {
        visit(child);
      }
    }
  };

  visit(root);
  return output;
}

const pageNode = nodes.find((node) => node.depth === 0 && node.type === 'FRAME') || nodes[0];
const topLevelNodes = nodes.filter((node) => node.parent?.nodeId === pageNode.nodeId);

function expandContentSection(node) {
  if (/header|gnb|footer/i.test(node.name || '')) return [node];

  let root = node;
  while (true) {
    const directTextCount = root.children.filter((child) => child.type === 'TEXT' && child.value).length;
    const contentChildren = root.children.filter(
      (child) => child.type !== 'TEXT' && collectTextNodes(child).length > 0
    );

    if (directTextCount === 0 && contentChildren.length === 1) {
      root = contentChildren[0];
      continue;
    }

    // 하나의 거대한 프레임을 그대로 모델에 넘기지 않고, Figma가 가진
    // 실제 형제 영역 단위로만 분리한다. 텍스트 내용에는 의존하지 않는다.
    if (directTextCount === 0 && contentChildren.length >= 2) return contentChildren;
    return [node];
  }
}

const analysisNodes = topLevelNodes
  .flatMap(expandContentSection)
  .flatMap((node) => {
    if (/header|gnb|footer/i.test(node.name || '')) return [node];
    if (!/top|content|wrapper/i.test(node.name || '')) return [node];
    if (collectTextNodes(node).length <= 5) return [node];

    const directTextCount = node.children.filter(
      (child) => child.type === 'TEXT' && child.value
    ).length;
    const contentChildren = node.children.filter(
      (child) => child.type !== 'TEXT' && collectTextNodes(child).length > 0
    );

    return directTextCount === 0 && contentChildren.length >= 2
      ? contentChildren
      : [node];
  });

const sourceSections = analysisNodes
  .map((node, sourceIndex) => {
    const textNodes = collectTextNodes(node).map((textNode, index) => ({
      ...textNode,
      ref: `t${index + 1}`,
    }));

    return {
      nodeId: node.nodeId,
      name: node.name,
      type: node.type,
      depth: node.depth,
      sourceIndex,
      childCount: node.children.length,
      textNodes,
    };
  })
  .filter((section) => section.textNodes.length > 0);

// MCP 본문 카탈로그에만 있고 TEXT 노드 값이 비어 있는 문자열도 후보로 제공한다.
// 파일명·금액처럼 Figma 인스턴스 속성에만 남는 값이 여기에 해당한다.
const parsedTextValues = new Set(
  sourceSections.flatMap((section) => section.textNodes.map((node) => node.text))
);
const catalogNodes = [...new Set((input.textCatalog || []).map(decodeText).filter(Boolean))]
  .filter((text) => !parsedTextValues.has(text))
  .map((text, index) => ({
    ref: `c${index + 1}`,
    nodeId: `catalog:c${index + 1}`,
    name: 'SOURCE_TEXT_CATALOG',
    text,
    order: index,
  }));

return [{
  json: {
    ...input,
    pageName: pageNode.name,
    pageNodeId: pageNode.nodeId,
    sourceSections,
    catalogNodes,
    sourceSectionCount: sourceSections.length,
    parsedNodeCount: nodes.length,
  },
}];
