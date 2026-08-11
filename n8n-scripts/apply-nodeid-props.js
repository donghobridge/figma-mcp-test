const result = JSON.parse(JSON.stringify($input.first().json));
const sourceItems = $('Split Out').all();
const componentMap = sourceItems[0]?.json?.data || {};
const textNodeMap = new Map();
const sourceTextNodes = new Map();

for (const sourceItem of sourceItems) {
  const sourceSection = sourceItem.json.sourceSection || {};
  const nodes = sourceSection.textNodes || [];
  sourceTextNodes.set(sourceSection.nodeId, nodes);
  for (const textNode of nodes) {
    textNodeMap.set(textNode.nodeId, textNode);
  }
}

for (const catalogNode of sourceItems[0]?.json?.catalogNodes || []) {
  textNodeMap.set(catalogNode.nodeId, catalogNode);
}

const warnings = Array.isArray(result.warnings) ? [...result.warnings] : [];
const usedTextNodeIds = new Set();
let mappedPropCount = 0;
let requiredPropCount = 0;
let missingRequiredCount = 0;

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

result.components = (result.components || []).map((item) => {
  const definition = componentMap[item.component] || {};
  const content = {};

  for (const prop of definition.props || []) {
    const nodeId = item.propNodeIds?.[prop] || '';
    const textNode = nodeId ? textNodeMap.get(nodeId) : null;
    content[prop] = textNode?.text || '';

    if (textNode) {
      usedTextNodeIds.add(nodeId);
      mappedPropCount += 1;
    }
  }

  const sectionNodes = sourceTextNodes.get(item.sourceNodeId) || [];
  const assignedIds = new Set(Object.values(item.propNodeIds || {}).filter(Boolean));
  const remainingNodes = sectionNodes.filter((node) => !assignedIds.has(node.nodeId));

  if (item.component === 'GenericSection') {
    content.title = sectionNodes[0]?.text || content.title || '';
    content.body = sectionNodes.slice(1).map((node) => node.text).join('\n');
    sectionNodes.forEach((node) => usedTextNodeIds.add(node.nodeId));
  } else if (item.component === 'GenericList') {
    content.title = sectionNodes[0]?.text || content.title || '';
    content.itemsHtml = sectionNodes.slice(1).map((node) => `<li>${escapeHtml(node.text)}</li>`).join('');
    sectionNodes.forEach((node) => usedTextNodeIds.add(node.nodeId));
  } else if (item.component === 'ActionButtonGroup') {
    content.buttonsHtml = sectionNodes.map((node) => `<a class="ui-button ui-button--primary" href="#">${escapeHtml(node.text)}</a>`).join('');
    sectionNodes.forEach((node) => usedTextNodeIds.add(node.nodeId));
  } else if (item.component === 'DataTable') {
    const headers = sectionNodes.slice(0, 5);
    headers.forEach((node, index) => { content[`header${index + 1}`] = node.text; });
    const cells = sectionNodes.slice(5);
    const rows = [];
    for (let index = 0; index < cells.length; index += 5) {
      rows.push(`<tr>${cells.slice(index, index + 5).map((node) => `<td>${escapeHtml(node.text)}</td>`).join('')}</tr>`);
    }
    content.rowsHtml = rows.join('');
    sectionNodes.forEach((node) => usedTextNodeIds.add(node.nodeId));
  } else if (item.component === 'LoanCard' && remainingNodes.length) {
    content.actionsHtml = remainingNodes.map((node) => `<a class="ui-button ui-button--secondary" href="#">${escapeHtml(node.text)}</a>`).join('');
    remainingNodes.forEach((node) => usedTextNodeIds.add(node.nodeId));
  }

  for (const prop of definition.requiredProps || []) {
    requiredPropCount += 1;
    if (!String(content[prop] || '').trim()) {
      missingRequiredCount += 1;
      warnings.push(`필수 값 누락: ${item.component}.${prop}`);
    }
  }

  if (definition.consumesSourceText === true) {
    for (const textNode of sourceTextNodes.get(item.sourceNodeId) || []) {
      usedTextNodeIds.add(textNode.nodeId);
    }
  }

  return { ...item, content };
});

const contentTextNodes = sourceItems
  .filter((item) => !/header|gnb|footer/i.test(item.json.sourceSection?.name || ''))
  .flatMap((item) => item.json.sourceSection?.textNodes || []);
const uniqueContentNodeIds = new Set(contentTextNodes.map((node) => node.nodeId));
const usedContentCount = [...usedTextNodeIds].filter((nodeId) => uniqueContentNodeIds.has(nodeId)).length;
const textCoverage = uniqueContentNodeIds.size
  ? Math.round((usedContentCount / uniqueContentNodeIds.size) * 1000) / 10
  : 100;
const minimumTextCoverage = 70;

result.warnings = [...new Set(warnings)];
result.quality = {
  status:
    missingRequiredCount === 0 && textCoverage >= minimumTextCoverage
      ? 'PASS'
      : 'REVIEW_REQUIRED',
  mappedPropCount,
  requiredPropCount,
  missingRequiredCount,
  contentTextNodeCount: uniqueContentNodeIds.size,
  usedContentTextNodeCount: usedContentCount,
  textCoverage,
  minimumTextCoverage,
};

if (textCoverage < minimumTextCoverage) {
  result.warnings.push(
    `본문 TEXT 반영률 확인 필요: ${textCoverage}% (기준 ${minimumTextCoverage}%)`
  );
}

if (!result.components.length) {
  throw new Error('생성할 컴포넌트가 없습니다.');
}

return [{ json: result }];
