const input = $input.first().json;
const rawText = input.content
  ?.find((item) => item.type === 'text')
  ?.text;

if (!rawText) throw new Error('MCP 결과에서 content[].text를 찾을 수 없습니다.');

function decode(value) {
  return String(value == null ? '' : value)
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    // Figma MCP는 주석 텍스트를 \\[Header\\] 또는 \\\\[Header\\\\]로 반환할 수 있다.
    .replace(/\\+([\[\]])/g, '$1')
    .replace(/\{ts\d+\}|\{\/ts\d+\}/g, '')
    .trim();
}

function decodeYamlScalar(value) {
  const source = String(value == null ? '' : value).trim();
  if (!source) return '';
  if (source.startsWith('"') && source.endsWith('"')) {
    try {
      return decode(JSON.parse(source));
    } catch (_) {
      return decode(source.slice(1, -1));
    }
  }
  if (source.startsWith("'") && source.endsWith("'")) {
    return decode(source.slice(1, -1).replace(/''/g, "'"));
  }
  return decode(source);
}

const labelPattern = /\[\s*([A-Za-z][A-Za-z0-9]*)(?:\s*:\s*([^\]]+))?\s*\]/g;

function labelsFrom(value) {
  const labels = [];
  const source = String(value || '');
  labelPattern.lastIndex = 0;
  let match;
  while ((match = labelPattern.exec(source)) !== null) {
    labels.push({ component: match[1], propsHint: String(match[2] || '').trim() });
  }
  return labels;
}

const allLines = rawText.split(/\r?\n/);
const yamlTexts = [];
const yamlAnnotations = [];
const elementTextById = {};
let inElements = false;
let currentElement = null;

for (let lineIndex = 0; lineIndex < allLines.length; lineIndex += 1) {
  const line = allLines[lineIndex];
  if (/^ELEMENTS:\s*$/.test(line.trim())) {
    inElements = true;
    currentElement = null;
    continue;
  }
  if (/^(COMPONENTS|NODES):\s*$/.test(line.trim())) {
    inElements = false;
    currentElement = null;
    continue;
  }
  if (!inElements) continue;

  const elementMatch = line.match(/^\s{0,2}([A-Za-z][A-Za-z0-9_-]*):\s*$/);
  if (elementMatch) {
    currentElement = { id: elementMatch[1], type: '', order: lineIndex };
    continue;
  }
  if (!currentElement) continue;

  const typeMatch = line.match(/^\s+type:\s*(.+?)\s*$/);
  if (typeMatch) {
    currentElement.type = decodeYamlScalar(typeMatch[1]);
    continue;
  }

  const textMatch = line.match(/^\s+(?:text|characters|content):\s*(.*?)\s*$/);
  if (!textMatch) continue;
  const value = decodeYamlScalar(textMatch[1]);
  if (!value) continue;

  elementTextById[currentElement.id] = value;
  yamlTexts.push({ nodeId: currentElement.id, text: value, order: lineIndex });
  for (const label of labelsFrom(value)) {
    yamlAnnotations.push({
      ...label,
      nodeId: currentElement.id,
      order: lineIndex,
      source: 'elementsText',
    });
  }
}

const nodesIndex = rawText.indexOf('NODES:');
if (nodesIndex === -1) throw new Error('MCP 결과에서 NODES 구간을 찾을 수 없습니다.');

const outputLines = [];
const inlineTexts = [];
const inlineAnnotations = [];
const inlineKeys = new Set();
const nodeLines = rawText.slice(nodesIndex).split(/\r?\n/);

function addInlineAnnotation(component, propsHint, nodeId, order, source) {
  const normalized = String(component || '').trim();
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(normalized)) return;
  const key = `${normalized}:${nodeId || order}`;
  if (inlineKeys.has(key)) return;
  inlineKeys.add(key);
  inlineAnnotations.push({
    component: normalized,
    propsHint: String(propsHint || '').trim(),
    nodeId: nodeId || '',
    order,
    source,
  });
}

for (let lineIndex = 0; lineIndex < nodeLines.length; lineIndex += 1) {
  const line = nodeLines[lineIndex];
  const nodeMatch = line.match(
    /^(\s*)\[(FRAME|INSTANCE|COMPONENT|COMPONENT_SET|GROUP|SECTION|TEXT|RECTANGLE|ELLIPSE|LINE|VECTOR|IMAGE-SVG)\](?:\s+"([^"]*)")?/
  );
  if (!nodeMatch) continue;

  const indent = nodeMatch[1];
  const type = nodeMatch[2];
  const name = nodeMatch[3]
    || (line.match(/\bname="((?:\\.|[^"])*)"/) || [])[1]
    || '';
  const id = (line.match(/\bid="((?:\\.|[^"])*)"/) || [])[1]
    || (line.match(/\s#([^\s]+)/) || [])[1]
    || '';
  const rawValue = (line.match(/\b(?:text|characters|content)="((?:\\.|[^"])*)"/) || [])[1];
  const templateId = (line.match(/\btemplate=([^\s]+)/) || [])[1] || '';
  const value = decode(rawValue || elementTextById[templateId] || '');

  let simplified = `${indent}[${type}]`;
  if (name) simplified += ` name="${name}"`;
  if (id) simplified += ` id="${id}"`;
  if (value) simplified += ` text=${JSON.stringify(value)}`;
  outputLines.push(simplified);

  if (value) {
    inlineTexts.push({ nodeId: id, text: value, order: lineIndex });
    for (const label of labelsFrom(value)) {
      addInlineAnnotation(label.component, label.propsHint, id, lineIndex, 'nodesText');
    }
  }

  const nameLabel = name.match(/^\[?\s*([A-Za-z][A-Za-z0-9]*)(?:\s*:\s*([^\]]+))?\s*\]?$/);
  if (nameLabel && /^(Header|Footer|Breadcrumb|SectionHeading|Form[A-Za-z0-9]+|ImageText|Notice|Button|ActionButtonGroup|GenericList)$/.test(nameLabel[1])) {
    addInlineAnnotation(nameLabel[1], nameLabel[2], id, lineIndex, 'nodeName');
  }
}

if (!outputLines.length) throw new Error('Figma 노드 구조를 추출하지 못했습니다.');

// ELEMENTS는 재사용 템플릿 정의라 같은 라벨이 한 번만 나타날 수 있다.
// 실제 화면의 배치 순서와 반복 횟수가 들어 있는 NODES를 정본으로 사용하고,
// NODES에 텍스트가 없는 특수 응답에서만 ELEMENTS를 대체 자료로 사용한다.
const annotations = inlineAnnotations.length ? inlineAnnotations : yamlAnnotations;
const texts = inlineTexts.length ? inlineTexts : yamlTexts;

if (!annotations.length) {
  throw new Error(
    '컴포넌트 라벨을 찾지 못했습니다. Figma 프레임에 [Header] 형식의 TEXT 레이어가 포함되어 있는지, MCP nodeId가 전체 와이어프레임 프레임인지 확인하세요.'
  );
}

const pageLine = outputLines.find((line) => /^\[FRAME\]/.test(line.trim())) || '';
const rawName = (rawText.match(/^NAME:\s*["']?([^"'\r\n]+)["']?/m) || [])[1];
const pageName = decode(rawName)
  || (pageLine.match(/name="([^"]+)"/) || [])[1]
  || 'Figma Wireframe';

const sortedAnnotations = annotations.slice().sort((a, b) => a.order - b.order);
const annotationPlan = sortedAnnotations.map((annotation, index) => {
  const nextOrder = sortedAnnotations[index + 1]?.order ?? Number.POSITIVE_INFINITY;
  const nearbyTexts = texts
    .filter((item) => item.order > annotation.order && item.order < nextOrder)
    .map((item) => item.text)
    .filter((text) => !labelsFrom(text).length)
    .slice(0, 40);
  return { ...annotation, nearbyTexts };
});

const sourceCatalog = texts
  .map((item) => `${item.nodeId || 'TEXT'}: ${JSON.stringify(item.text)}`)
  .join('\n');

return [{
  json: {
    pageName,
    figmaWireframeText: `${outputLines.join('\n')}\n\nSOURCE_TEXT_CATALOG:\n${sourceCatalog}`,
    annotations: sortedAnnotations,
    annotationPlan,
    annotationComponents: [...new Set(sortedAnnotations.map((item) => item.component))],
    annotationMode: 'tagged',
    warnings: [],
    textCount: texts.length,
    nodeCount: outputLines.length,
  },
}];
