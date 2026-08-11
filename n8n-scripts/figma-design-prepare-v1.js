module.exports = function ($input, helpers) {
/**
 * Figma 디자인 시안 MCP 결과 → 구조 트리/텍스트/파란 주석
 * blue-label 의 [Component: props] 를 형제 컨텐츠 노드에 부착.
 */
const input = $input.first().json;
const rawText = input.content
  ?.find((item) => item.type === 'text')
  ?.text;

if (!rawText) throw new Error('MCP 결과에서 content[].text를 찾을 수 없습니다.');

function decode(value) {
  return String(value == null ? '' : value)
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\+([*_()[\]])/g, '$1')
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

function parsePropsHint(hint) {
  const result = {};
  const source = String(hint || '').trim();
  if (!source) return result;

  // items=['이벤트', '프로그램'] / tags=["a","b"]
  const arrayPattern = /([A-Za-z][\w]*)\s*=\s*\[([^\]]*)\]/g;
  let arrayMatch;
  while ((arrayMatch = arrayPattern.exec(source)) !== null) {
    const key = arrayMatch[1];
    const rawItems = String(arrayMatch[2] || '')
      .split(',')
      .map((part) => part.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
    if (!rawItems.length) continue;
    if (/^items$/i.test(key)) {
      rawItems.slice(0, 4).forEach((item, i) => {
        result[`item${i + 1}`] = item;
      });
    } else if (/^tags$/i.test(key)) {
      rawItems.slice(0, 2).forEach((item, i) => {
        result[`tag${i + 1}`] = item;
      });
    } else {
      result[key] = rawItems.join(', ');
    }
  }

  const pairPattern = /([A-Za-z][\w]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^,\]\[]+))/g;
  let match;
  while ((match = pairPattern.exec(source)) !== null) {
    const key = match[1];
    if (Object.prototype.hasOwnProperty.call(result, key)) continue;
    let value = String(match[2] ?? match[3] ?? match[4] ?? '').trim();
    value = value.replace(/^['"]|['"]$/g, '').trim();
    if (!value) continue;
    result[key] = value;
  }

  // 스타일 힌트는 컴포넌트 props가 아님
  const STYLE_KEYS = new Set([
    'height', 'width', 'bg', 'background', 'color', 'size', 'padding', 'margin', 'gap',
  ]);
  for (const key of Object.keys(result)) {
    if (STYLE_KEYS.has(key)) delete result[key];
  }
  return result;
}

function componentNameLikely(name) {
  return /^[A-Z][A-Za-z0-9]+$/.test(String(name || ''));
}

function parseGlobalVars(source) {
  const fills = {};
  const styles = {};
  const match = String(source || '').match(
    /GLOBAL_VARS:\s*\n([\s\S]*?)(?=\n(?:COMPONENTS|NODES|ELEMENTS):\s*$)/m
  );
  if (!match) return { fills, styles };

  const lines = match[1].split(/\r?\n/);
  let currentKey = '';
  let currentKind = '';
  let currentStyle = null;

  for (const line of lines) {
    const keyMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (keyMatch && !/^\s/.test(line)) {
      if (currentKind === 'style' && currentKey && currentStyle) {
        styles[currentKey] = currentStyle;
      }
      currentKey = keyMatch[1];
      const rest = String(keyMatch[2] || '').trim();
      currentStyle = null;
      currentKind = '';

      if (/^fill_/i.test(currentKey)) {
        currentKind = 'fill';
        if (rest.startsWith('#') || rest.startsWith("'") || rest.startsWith('"')) {
          fills[currentKey] = decodeYamlScalar(rest.replace(/^-\s*/, ''));
        }
      } else if (/^style_/i.test(currentKey)) {
        currentKind = 'style';
        currentStyle = {};
        if (rest.startsWith('{')) {
          try {
            currentStyle = JSON.parse(rest);
            styles[currentKey] = currentStyle;
            currentStyle = null;
            currentKind = '';
          } catch (_) {
            currentStyle = {};
          }
        }
      } else {
        currentKind = 'other';
      }
      continue;
    }

    if (currentKind === 'fill') {
      const colorMatch = line.match(/^\s*-\s*(.+)\s*$/);
      if (colorMatch && !fills[currentKey]) {
        fills[currentKey] = decodeYamlScalar(colorMatch[1]);
      }
    } else if (currentKind === 'style' && currentStyle) {
      const propMatch = line.match(/^\s+([A-Za-z][\w]*)\s*:\s*(.+)\s*$/);
      if (propMatch) {
        const prop = propMatch[1];
        let value = decodeYamlScalar(propMatch[2]);
        if (/^(fontSize|fontWeight)$/.test(prop) && /^-?\d+(\.\d+)?$/.test(value)) {
          value = Number(value);
        }
        currentStyle[prop] = value;
      }
    }
  }

  if (currentKind === 'style' && currentKey && currentStyle) {
    styles[currentKey] = currentStyle;
  }

  return { fills, styles };
}

function resolveTextStyle(line, fills, styles) {
  const fillRef = (line.match(/\bfills=(fill_[A-Za-z0-9]+)/) || [])[1] || '';
  let color = fillRef && fills[fillRef] ? fills[fillRef] : '';
  if (!color) {
    const inlineFill = (line.match(/\bfills=(\[[^\]]*\])/) || [])[1];
    if (inlineFill) {
      try {
        const arr = JSON.parse(inlineFill.replace(/'/g, '"'));
        if (Array.isArray(arr) && arr[0]) color = String(arr[0]);
      } catch (_) {}
    }
  }

  let style = null;
  const styleRef = (line.match(/\btextStyle=(style_[A-Za-z0-9]+)/) || [])[1];
  if (styleRef && styles[styleRef]) {
    style = styles[styleRef];
  } else {
    const inlineStyle = (line.match(/\btextStyle=(\{[\s\S]*?\})(?:\s+\w+=|\s*$)/) || [])[1]
      || (line.match(/\btextStyle=(\{[^\n]*\})/) || [])[1];
    if (inlineStyle) {
      try {
        style = JSON.parse(inlineStyle);
      } catch (_) {
        style = null;
      }
    }
  }

  return {
    color: color || '',
    fontSize: style && style.fontSize != null ? Number(style.fontSize) : null,
    fontWeight: style && style.fontWeight != null ? Number(style.fontWeight) : null,
    fontFamily: style && style.fontFamily ? String(style.fontFamily) : '',
  };
}

const { fills: globalFills, styles: globalStyles } = parseGlobalVars(rawText);

const allLines = rawText.split(/\r?\n/);
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
    currentElement = { id: elementMatch[1] };
    continue;
  }
  if (!currentElement) continue;

  const textMatch = line.match(/^\s+(?:text|characters|content):\s*(.*?)\s*$/);
  if (textMatch) {
    const value = decodeYamlScalar(textMatch[1]);
    if (value) elementTextById[currentElement.id] = value;
  }
}

const nodesIndex = rawText.indexOf('NODES:');
if (nodesIndex === -1) throw new Error('MCP 결과에서 NODES 구간을 찾을 수 없습니다.');

const nodeLines = rawText.slice(nodesIndex).split(/\r?\n/);
const structuralNodes = [];
const textNodes = [];

const STRUCT_TYPES = new Set([
  'FRAME', 'INSTANCE', 'COMPONENT', 'COMPONENT_SET', 'GROUP', 'SECTION',
]);

for (let lineIndex = 0; lineIndex < nodeLines.length; lineIndex += 1) {
  const line = nodeLines[lineIndex];
  const nodeMatch = line.match(
    /^(\s*)\[(FRAME|INSTANCE|COMPONENT|COMPONENT_SET|GROUP|SECTION|TEXT|RECTANGLE|ELLIPSE|LINE|VECTOR|IMAGE-SVG)\](?:\s+"([^"]*)")?/
  );
  if (!nodeMatch) continue;

  const indent = nodeMatch[1].length;
  const depth = Math.floor(indent / 2);
  const type = nodeMatch[2];
  const name = decode(
    nodeMatch[3]
    || (line.match(/\bname="((?:\\.|[^"])*)"/) || [])[1]
    || ''
  );
  const id = (line.match(/\bid="((?:\\.|[^"])*)"/) || [])[1]
    || (line.match(/\s#([^\s]+)/) || [])[1]
    || '';
  const rawValue = (line.match(/\b(?:text|characters|content)="((?:\\.|[^"])*)"/) || [])[1];
  const templateId = (line.match(/\btemplate=([^\s]+)/) || [])[1] || '';
  const text = decode(rawValue || elementTextById[templateId] || '');
  const styleInfo = resolveTextStyle(line, globalFills, globalStyles);
  const fillRef = (line.match(/\bfills=(fill_[A-Za-z0-9]+)/) || [])[1] || '';
  const fillColor = (fillRef && globalFills[fillRef]) || styleInfo.color || '';

  if (type === 'TEXT' && text) {
    textNodes.push({
      id,
      name,
      text,
      depth,
      order: lineIndex,
      color: styleInfo.color || '',
      fontSize: styleInfo.fontSize,
      fontWeight: styleInfo.fontWeight,
      fontFamily: styleInfo.fontFamily || '',
    });
  }

  if (!STRUCT_TYPES.has(type)) continue;
  if (/^(Line|Rectangle|Ellipse|Vector|img|image)$/i.test(name)) continue;

  structuralNodes.push({
    id,
    type,
    name,
    depth,
    order: lineIndex,
    text: text || '',
    fillColor: fillColor || '',
  });
}

if (!structuralNodes.length) {
  throw new Error('디자인 시안에서 FRAME/INSTANCE/COMPONENT 구조를 찾지 못했습니다. nodeId가 시안 루트인지 확인하세요.');
}

// 오른쪽 명세 컬럼 제외용: right-column / spec-* 하위
function isSpecBranch(index) {
  for (let i = index; i >= 0; i -= 1) {
    const n = structuralNodes[i];
    if (i < index && n.depth >= structuralNodes[index].depth) continue;
    if (i < index && n.depth < structuralNodes[index].depth) {
      if (/^(right-column|spec-header|spec-sec|화면\s*설계)/i.test(n.name)) return true;
      if (/설계\s*명세|specification/i.test(n.name)) return true;
      if (n.depth === 0) return false;
    }
  }
  // walk ancestors by depth
  let depth = structuralNodes[index].depth;
  for (let i = index - 1; i >= 0; i -= 1) {
    const n = structuralNodes[i];
    if (n.depth < depth) {
      if (/^(right-column|spec-)/i.test(n.name)) return true;
      depth = n.depth;
      if (depth <= 1 && /right-column/i.test(n.name)) return true;
    }
  }
  return false;
}

const enriched = structuralNodes.map((node, index) => {
  const nextSameOrHigher = structuralNodes
    .slice(index + 1)
    .find((other) => other.depth <= node.depth);
  const endOrder = nextSameOrHigher ? nextSameOrHigher.order : Number.POSITIVE_INFINITY;
  const childTexts = textNodes
    .filter((t) => t.order > node.order && t.order < endOrder && t.depth > node.depth)
    .map((t) => t.text)
    .filter(Boolean)
    .slice(0, 80);
  const ownTexts = textNodes
    .filter((t) => t.order > node.order && t.order < endOrder && t.depth === node.depth + 1)
    .map((t) => t.text)
    .filter(Boolean)
    .slice(0, 40);

  // 직계 blue-label 주석
  let annotation = null;
  const directChildren = [];
  for (let j = index + 1; j < structuralNodes.length; j += 1) {
    const child = structuralNodes[j];
    if (child.depth <= node.depth) break;
    if (child.depth === node.depth + 1) directChildren.push({ node: child, index: j });
  }
  for (const { node: child } of directChildren) {
    if (!/^blue-label$/i.test(child.name) && !/label|annotation|tag/i.test(child.name)) continue;
    const childIdx = structuralNodes.indexOf(child);
    const childEnd = structuralNodes
      .slice(childIdx + 1)
      .find((o) => o.depth <= child.depth);
    const childEndOrder = childEnd ? childEnd.order : endOrder;
    const labelTexts = textNodes
      .filter((t) => t.order > child.order && t.order < childEndOrder)
      .map((t) => t.text);
    for (const text of [...labelTexts, child.text]) {
      const labels = labelsFrom(text);
      if (labels.length) {
        annotation = {
          component: labels[0].component,
          props: parsePropsHint(labels[0].propsHint),
          raw: text,
        };
        break;
      }
    }
    if (annotation) break;
  }

  // 직계 텍스트 / 자신 근처 주석 (blue-label 프레임명이 없어도 [CaseHeader] 텍스트면 인식)
  if (!annotation) {
    const nearTexts = textNodes
      .filter((t) => t.order > node.order && t.order < endOrder && t.depth <= node.depth + 2)
      .map((t) => t.text);
    for (const text of [node.text, ...ownTexts, ...nearTexts]) {
      const trimmed = String(text || '').trim();
      if (!trimmed.startsWith('[')) continue;
      const labels = labelsFrom(trimmed);
      if (labels.length && componentNameLikely(labels[0].component)) {
        annotation = {
          component: labels[0].component,
          props: parsePropsHint(labels[0].propsHint),
          raw: trimmed,
        };
        break;
      }
    }
  }

  return {
    ...node,
    childTexts,
    ownTexts: ownTexts.length ? ownTexts : childTexts.slice(0, 20),
    annotation,
    isSpec: isSpecBranch(index),
    isBlueLabel: /^blue-label$/i.test(node.name),
  };
});

// blue-label 에만 주석이 있으면 가장 가까운 비-blue 조상으로 승격
for (let i = 0; i < enriched.length; i += 1) {
  const node = enriched[i];
  if (!node.annotation) continue;
  if (!node.isBlueLabel && !/^label|annotation$/i.test(node.name)) continue;
  for (let j = i - 1; j >= 0; j -= 1) {
    const parent = enriched[j];
    if (parent.depth >= node.depth) continue;
    if (parent.isBlueLabel || parent.isSpec) {
      // keep walking up
      if (parent.depth < node.depth) {
        // continue to find non-blue parent
      }
    }
    if (!parent.isBlueLabel) {
      if (!parent.annotation) parent.annotation = node.annotation;
      break;
    }
  }
}

// 오른쪽 화면 설계 명세 → 컴포넌트별 props (badge1: … / title: …)
const KNOWN_COMPONENTS = new Set([
  'Header', 'Footer', 'Breadcrumb', 'CaseHeader', 'ContactBar', 'AttachmentList',
  'QuestionContent', 'AnswerPanel', 'Button', 'SectionHeading', 'FormCard',
  'FormTextField', 'FormRadioGroup', 'FormCheckboxGroup', 'FormTerms', 'FormDateField',
  'FormAddressField', 'FormSelect', 'FormTextarea',
]);

function extractSpecPropsByComponent(nodes, texts) {
  const byComponent = {};
  const stream = [];

  for (const node of nodes) {
    if (!node.isSpec) continue;
    for (const text of [...(node.ownTexts || []), ...(node.childTexts || [])]) {
      const value = String(text || '').trim();
      if (value) stream.push(value);
    }
    if (node.text) stream.push(String(node.text).trim());
  }

  // 명세 텍스트가 구조 노드에 덜 붙는 경우 대비: 전체 텍스트에서 prop 라인도 스캔
  if (stream.length < 8) {
    for (const t of texts || []) {
      const value = String(t.text || '').trim();
      if (!value) continue;
      if (/^(?:[①-⑳]|\d{1,2}[.)]?\s*)?[A-Z][A-Za-z0-9]+$/.test(value)
        || /^\[([A-Z][A-Za-z0-9]+)/.test(value)
        || /^[A-Za-z][\w]*\s*[:：=]/.test(value)) {
        stream.push(value);
      }
    }
  }

  let current = '';
  for (const raw of stream) {
    const text = String(raw || '').trim();
    if (!text) continue;

    const bracket = labelsFrom(text);
    if (bracket.length && KNOWN_COMPONENTS.has(bracket[0].component)) {
      current = bracket[0].component;
      if (!byComponent[current]) byComponent[current] = {};
      Object.assign(byComponent[current], parsePropsHint(bracket[0].propsHint));
      continue;
    }

    const numbered = text.match(/^(?:[①-⑳]|[0-9]{1,2}[.)]|제?\s*\d+\s*[.)])\s*([A-Z][A-Za-z0-9]+)\b/);
    if (numbered && KNOWN_COMPONENTS.has(numbered[1])) {
      current = numbered[1];
      if (!byComponent[current]) byComponent[current] = {};
      continue;
    }

    if (KNOWN_COMPONENTS.has(text) || /^[A-Z][A-Za-z0-9]+$/.test(text) && KNOWN_COMPONENTS.has(text)) {
      current = text;
      if (!byComponent[current]) byComponent[current] = {};
      continue;
    }

    if (!current) continue;
    if (/^(props|영역|동작|note|notes|설명|비고)$/i.test(text)) continue;

    const colon = text.match(/^([A-Za-z][\w]*)\s*[:：]\s*(.+)$/);
    if (colon) {
      const key = colon[1];
      const value = colon[2].trim().replace(/^TODO\b.*$/i, '').trim();
      if (!value || /^(TODO|TBD|-)$/i.test(value)) continue;
      if (/^(props|영역|동작)$/i.test(key)) continue;
      byComponent[current][key] = value;
      continue;
    }

    Object.assign(byComponent[current], parsePropsHint(text));
  }

  return byComponent;
}

const specPropsByComponent = extractSpecPropsByComponent(enriched, textNodes);

const pageLine = structuralNodes.find((n) => n.type === 'FRAME' && n.depth === 0)
  || structuralNodes[0];
const rawName = (rawText.match(/^NAME:\s*["']?([^"'\r\n]+)["']?/m) || [])[1];
const pageName = decode(rawName) || pageLine.name || 'Figma Design';

function isNoiseText(value) {
  const text = String(value || '').trim();
  if (!text) return true;
  if (/^notes?:/i.test(text) || /^TODO\b/i.test(text)) return true;
  if (/^\[/.test(text) && /\]/.test(text) && text.length < 80) return true;
  if (/설계\s*명세|specification|props\s*:/i.test(text)) return true;
  return false;
}

const textStyleSnapshot = textNodes
  .filter((t) => !isNoiseText(t.text))
  .map((t) => ({
    text: String(t.text).slice(0, 120),
    color: t.color || '',
    fontSize: t.fontSize,
    fontWeight: t.fontWeight,
  }))
  .slice(0, 120);

const colorPalette = [];
const seenColors = new Set();
for (const color of [
  ...textNodes.map((t) => t.color),
  ...structuralNodes.map((n) => n.fillColor),
  ...Object.values(globalFills),
]) {
  const hex = String(color || '').trim();
  if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(hex)) continue;
  const key = hex.toUpperCase();
  if (seenColors.has(key)) continue;
  seenColors.add(key);
  colorPalette.push(hex);
  if (colorPalette.length >= 24) break;
}

const runConfig = (helpers && helpers.runConfig) || {};
const annotationCount = enriched.filter((n) => n.annotation && !n.isBlueLabel).length;

return [{
  json: {
    pageName,
    designNodes: enriched,
    textNodes,
    textStyleSnapshot,
    colorPalette,
    nodeCount: structuralNodes.length,
    textCount: textNodes.length,
    annotationCount,
    specPropsByComponent,
    generationMode: 'ai-html-direct',
    warnings: annotationCount ? [] : ['파란 [Component] 주석을 찾지 못했습니다. 레이어명·텍스트로 AI가 매칭합니다.'],
    runConfig: {
      ...runConfig,
      fileKey: runConfig.fileKey || '',
      nodeId: runConfig.nodeId || '',
      pageSlug: runConfig.pageSlug || '',
      outputHtmlPath: runConfig.outputHtmlPath || '',
      outputReportPath: runConfig.outputReportPath || '',
      componentMapPath: runConfig.componentMapPath || '',
      githubOwner: runConfig.githubOwner || '',
      githubRepo: runConfig.githubRepo || '',
      githubBranch: runConfig.githubBranch || 'main',
      vercelBaseUrl: runConfig.vercelBaseUrl || '',
    },
  },
}];

};
