module.exports = function ($input, helpers) {
const prepared = (helpers && helpers.prepared) || {};
const extractedMap = $input.first().json || (helpers && helpers.extractedMap) || {};
const componentMap = extractedMap.data && typeof extractedMap.data === 'object'
  ? extractedMap.data
  : extractedMap;

function cleanText(value) {
  const text = String(value == null ? '' : value)
    .replace(/\{ts\d+\}|\{\/ts\d+\}/g, '')
    .replace(/\\([*_()[\]])/g, '$1')
    .trim();
  if (!text) return '';
  if (/^\{[^{}]+\}$/.test(text)) return '';
  if (/^\[[^\[\]]+\]$/.test(text)) return '';
  if (/^LOGO(\s+PLACEHOLDER)?$/i.test(text)) return '';
  if (/^IMAGE$/i.test(text)) return '';
  // Figma 라디오/체크 글리프만 있는 텍스트 제거
  if (/^[\s○●◎◯◉□■☐☑✓✔✕✖×><›‹·•‧∙]+$/u.test(text)) return '';
  return text;
}

/** [Component: title="기본정보", type: darkGrey, height=240] */
function parsePropsHint(hint) {
  const result = {};
  const source = String(hint || '').trim();
  if (!source) return result;
  const pairPattern = /([A-Za-z][\w]*)\s*[:=]\s*(?:"([^"]*)"|'([^']*)'|([^,\]]+))/g;
  let match;
  while ((match = pairPattern.exec(source)) !== null) {
    const key = match[1];
    const value = cleanText(match[2] ?? match[3] ?? match[4] ?? '');
    if (key && value !== '') result[key] = value;
  }
  // title="..." 없이 title만 따옴표로 온 경우 보완은 하지 않음
  return result;
}

function buildAliasIndex(map) {
  const index = new Map();
  for (const [name, definition] of Object.entries(map)) {
    if (!definition || typeof definition !== 'object') continue;
    if (definition.type === 'layout') continue;
    index.set(name, name);
    for (const alias of definition.aliases || []) {
      index.set(String(alias), name);
    }
    for (const figmaName of definition.figmaNames || []) {
      const token = String(figmaName || '').trim();
      if (/^[A-Za-z][A-Za-z0-9]*$/.test(token)) index.set(token, name);
    }
  }
  if (map.Header) {
    index.set('PortalHeader', 'Header');
    index.set('GNB', 'Header');
  }
  if (map.Footer) {
    index.set('PortalFooter', 'Footer');
  }
  return index;
}

const aliasIndex = buildAliasIndex(componentMap);

function resolveComponent(rawName) {
  const name = String(rawName || '').trim();
  return aliasIndex.get(name) || '';
}

function isFile(text) {
  return /\.[a-z0-9]{2,6}(?:$|[?#])/i.test(text) && !/바로보기|다운로드/.test(text);
}

function isPhone(text) {
  return /(?:\+?\d[\d\-.\s]{7,}\d)/.test(text) || /\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4}/.test(text);
}

function isDate(text) {
  return /(?:19|20)\d{2}[.\-/년]\s*\d{1,2}([.\-/월]\s*\d{1,2})?/.test(text)
    || /(?:19|20)\d{2}\.\d{2}\.\d{2}/.test(text);
}

function isMoney(text) {
  return /\d{1,3}(?:,\d{3})+\s*원|\d+\s*원/.test(text);
}

function isTag(text) {
  return /^#[^\s#]+$/.test(text);
}

function isUiChrome(text) {
  return /^(다운로드|바로보기|수정하기|취소|닫기|검색|주소 검색|파일 첨부)$/.test(text);
}

function isPropDump(text) {
  return /^•?\s*[A-Za-z][\w.]*\s*:/.test(text)
    || /^\*\*[^*]+\*\*/.test(text)
    || /^컴포넌트\s*:/.test(text);
}

function isBareFieldLabel(text) {
  return /^(카테고리|전화|이름|이메일|주소|제목|날짜|첨부파일|증빙파일)\s*:?\s*$/.test(text);
}

function normalizeNearbyText(value) {
  let text = cleanText(value);
  if (!text) return '';
  text = text
    .replace(/^\*\*[^*]+\*\*\s*:?\s*/g, '')
    .replace(/^•\s*[A-Za-z][\w.]*\s*:\s*/g, '')
    .replace(/^(카테고리|전화|이름|이메일)\s*:\s*/g, '')
    .trim();
  if (!text || isUiChrome(text) || isPropDump(text) || isBareFieldLabel(text)) return '';
  return text;
}

function extractPhone(text) {
  const match = String(text).match(/(?:\+?\d[\d\-.\s]{7,}\d|\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4})/);
  return match ? match[0].replace(/\s+/g, '-').trim() : '';
}

function assignFromNearby(component, definition, hintProps, nearbyTexts) {
  const content = {};
  const props = definition.props || [];
  const textProps = definition.textProps || props.filter((prop) => !prop.endsWith('Html') && !/href/i.test(prop));
  const propTypes = definition.propTypes || {};
  const ignoredHints = [];

  for (const [key, value] of Object.entries(hintProps || {})) {
    if (props.includes(key) && !key.endsWith('Html')) {
      content[key] = value;
      continue;
    }
    if (key === 'type' && /^(radio|checkbox)$/i.test(value)) {
      content.choiceType = value.toLowerCase();
      continue;
    }
    if (key === 'type' && component === 'Footer') {
      content.variantClass = value === 'darkGrey' || value === 'dark'
        ? 'ui-footer--dark'
        : `ui-footer--${value}`;
      continue;
    }
    if (key === 'type' && value === 'textarea') {
      content.variantClass = 'ui-form-field--textarea';
      content.multiline = 'true';
      continue;
    }
    if (key === 'label' && props.includes('label')) {
      content.label = value;
      continue;
    }
    if (key === 'title' && props.includes('title')) {
      content.title = value;
      continue;
    }
    ignoredHints.push(`${key}=${value}`);
  }

  const pool = nearbyTexts.map(normalizeNearbyText).filter(Boolean);
  const used = new Set();

  function take(predicate) {
    const index = pool.findIndex((text, i) => !used.has(i) && predicate(text, i));
    if (index < 0) return '';
    used.add(index);
    return pool[index];
  }

  function isGenericShort(text) {
    return text.length <= 80
      && !isPhone(text)
      && !isDate(text)
      && !isMoney(text)
      && !isTag(text)
      && !isFile(text);
  }

  // Breadcrumb: "A > B > C" 우선, 없으면 개별 토큰
  if (component === 'Breadcrumb') {
    const crumbSource = pool.find((text) => text.includes('>'));
    if (crumbSource) {
      const parts = crumbSource.split(/\s*>\s*/).map(cleanText).filter(Boolean);
      parts.slice(0, 4).forEach((part, index) => {
        content[`item${index + 1}`] = part;
      });
      const crumbIndex = pool.indexOf(crumbSource);
      if (crumbIndex >= 0) used.add(crumbIndex);
    }
  }

  // ContactBar: phone → category → name 순으로 의미 매핑
  if (component === 'ContactBar') {
    if (!content.phone) {
      const phoneRaw = take(isPhone);
      content.phone = extractPhone(phoneRaw) || phoneRaw;
    }
    if (!content.category) {
      content.category = take((text) => isGenericShort(text) && !/^\d+$/.test(text));
    }
    if (!content.name) {
      content.name = take((text) => isGenericShort(text) && text.length <= 40);
    }
  }

  // AttachmentList: 파일/유형만, 다운로드·바로보기는 pool에서 이미 제거됨
  if (component === 'AttachmentList') {
    if (!content.file1) content.file1 = take(isFile);
    if (!content.file2) content.file2 = take(isFile);
    if (!content.type1) {
      content.type1 = take((text) => /첨부|증빙|파일/.test(text) && text.length <= 20) || '첨부파일';
    }
    if (!content.type2 && content.file2) {
      content.type2 = take((text) => /첨부|증빙|파일/.test(text) && text.length <= 20) || content.type1 || '첨부파일';
    }
  }

  // AnswerPanel: 타입별 우선 매핑 (notice/cost/tag/longText)
  if (component === 'AnswerPanel') {
    if (!content.title) content.title = take((text) => /상담답변|답변/.test(text) && text.length <= 40) || '상담답변';
    if (!content.noticeDate) content.noticeDate = take(isDate);
    if (!content.tag1) content.tag1 = take(isTag);
    if (!content.tag2) content.tag2 = take(isTag);
    if (!content.costValue1) content.costValue1 = take(isMoney);
    if (!content.costValue2) content.costValue2 = take(isMoney);
    if (!content.costLabel1) {
      content.costLabel1 = take((text) => /비용|금액|수수료/.test(text) && text.length <= 20) || '소송비용';
    }
    if (!content.costLabel2) {
      content.costLabel2 = take((text) => /비용|금액|수수료/.test(text) && text.length <= 20) || '발생비용';
    }
    if (!content.noticeTitle) {
      content.noticeTitle = take((text) => /보완|요청|안내|공지/.test(text) && text.length <= 30);
    }
    if (!content.noticeMessage) {
      content.noticeMessage = take((text) => text.length >= 20 && text.length <= 160 && !isMoney(text) && !isDate(text));
    }
    if (!content.description) {
      content.description = take((text) => text.length >= 40) || take((text) => text.length >= 20);
    }
  }

  // CaseHeader
  if (component === 'CaseHeader') {
    if (!content.date) content.date = take(isDate);
    if (!content.title) {
      content.title = take((text) => text.length >= 8 && text.length <= 80 && !isDate(text) && !isPhone(text));
    }
    if (!content.badge1) content.badge1 = take((text) => isGenericShort(text) && text.length <= 30);
    if (!content.badge2) content.badge2 = take((text) => isGenericShort(text) && text.length <= 30);
  }

  // QuestionContent
  if (component === 'QuestionContent') {
    if (!content.description) {
      content.description = take((text) => text.length >= 40) || take((text) => text.length >= 20);
    }
    if (!content.label) {
      content.label = take((text) => text.length <= 40 && /종류|분류|유형|질문/.test(text))
        || take((text) => isGenericShort(text) && text.length <= 40);
    }
    if (!content.category) {
      content.category = take((text) => isGenericShort(text) && text.length <= 60);
    }
  }

  for (const prop of textProps) {
    if (content[prop]) continue;
    const ptype = propTypes[prop];
    if (ptype === 'file') content[prop] = take(isFile);
    else if (ptype === 'phone') {
      const phoneRaw = take(isPhone);
      content[prop] = extractPhone(phoneRaw) || phoneRaw;
    } else if (ptype === 'date') content[prop] = take(isDate);
    else if (ptype === 'tag') content[prop] = take(isTag);
    else if (ptype === 'money') content[prop] = take(isMoney);
    else if (ptype === 'href') content[prop] = '#';
    else if (ptype === 'longText') {
      content[prop] = take((text) => text.length >= 40) || take((text) => text.length >= 20);
    } else if (ptype === 'label') {
      content[prop] = take((text) => isGenericShort(text) && text.length <= 40);
    } else if (ptype === 'shortText') {
      content[prop] = take((text) => isGenericShort(text));
    } else if (/^(label|title|allLabel|eyebrow|searchLabel|buttonLabel|secondaryLabel|primaryLabel)$/.test(prop)) {
      content[prop] = take((text) => isGenericShort(text));
    } else if (/placeholder|helper|description|message/i.test(prop)) {
      content[prop] = take((text) => text.length >= 4 && !isDate(text) && !isMoney(text) && !isTag(text));
    } else if (/^item\d+$/i.test(prop) || /^tab\d+$/i.test(prop)) {
      content[prop] = take((text) => text.length <= 40 && !text.includes('\n') && !isUiChrome(text));
    } else if (/Value$/i.test(prop)) {
      content[prop] = '';
    } else {
      content[prop] = take((text) => isGenericShort(text) && text.length <= 120);
    }
  }

  for (const prop of props) {
    if (/href/i.test(prop) && !content[prop]) content[prop] = '#';
  }

  const remainder = pool.filter((_, index) => !used.has(index));
  const options = [];
  const items = [];
  const actions = [];

  if (component === 'FormChoiceGroup' || propTypes.optionsHtml === 'html') {
    for (const text of remainder) {
      if (text.length <= 40 && !/\n/.test(text)) options.push(text);
    }
  }
  if (component === 'FormTerms' || propTypes.itemsHtml === 'html') {
    for (const text of remainder) {
      if (text.length <= 120) items.push(text);
    }
    if (!content.allLabel) {
      const allLike = remainder.find((text) => /전체\s*동의/.test(text));
      if (allLike) content.allLabel = allLike;
    }
  }
  if (component === 'FormButtonGroup') {
    const labels = remainder.filter((text) => text.length <= 20);
    if (!content.secondaryLabel) {
      content.secondaryLabel = labels.find((text) => /취소|닫기|이전/.test(text)) || labels[0] || '';
    }
    if (!content.primaryLabel) {
      content.primaryLabel = labels.find((text) => text !== content.secondaryLabel && /참여|제출|확인|저장|신청|동의/.test(text))
        || labels.find((text) => text !== content.secondaryLabel)
        || '';
    }
  }
  if (component === 'ActionButtonGroup') {
    for (const text of remainder.filter((item) => item.length <= 30)) {
      actions.push({ label: text, href: '#' });
    }
  }

  return {
    content,
    options: options.slice(0, 30),
    items: items.slice(0, 30),
    actions: actions.slice(0, 10),
    ignoredHints,
  };
}

const warnings = Array.isArray(prepared.warnings) ? prepared.warnings.slice() : [];
const unknownLabels = [];

const resolvedPlan = (prepared.annotationPlan || []).map((item) => {
  const resolved = resolveComponent(item.component);
  if (!resolved) {
    unknownLabels.push(item.component);
    return null;
  }
  return { ...item, component: resolved, rawLabel: item.component };
}).filter(Boolean);

if (unknownLabels.length) {
  throw new Error('component-map에 없는 Figma 라벨: ' + [...new Set(unknownLabels)].join(', '));
}

const nodes = [];
let openContainer = null;
const expectedParents = []; // tree isomorphism: annotation index → parent component or null

for (const annotation of resolvedPlan) {
  const definition = componentMap[annotation.component] || {};
  if (definition.role === 'header' || definition.role === 'footer') {
    expectedParents.push({ component: annotation.component, parent: null, skipped: true });
    continue;
  }

  const hintProps = parsePropsHint(annotation.propsHint);
  const assigned = assignFromNearby(
    annotation.component,
    definition,
    hintProps,
    annotation.nearbyTexts || []
  );

  for (const ignored of assigned.ignoredHints) {
    warnings.push(`${annotation.component} propsHint 미매핑: ${ignored}`);
  }

  const node = {
    component: annotation.component,
    content: assigned.content,
    children: [],
    options: assigned.options,
    items: assigned.items,
    actions: assigned.actions,
    sourceNodeId: annotation.nodeId || '',
    figmaNode: annotation.rawLabel || annotation.component,
  };

  const nestable = definition.nestableInContainer === true;
  const acceptsChildren = definition.acceptsChildren === true;

  if (acceptsChildren) {
    openContainer = node;
    nodes.push(node);
    expectedParents.push({ component: annotation.component, parent: null });
    continue;
  }

  if (nestable && openContainer) {
    openContainer.children.push(node);
    expectedParents.push({ component: annotation.component, parent: openContainer.component });
    continue;
  }

  openContainer = null;
  nodes.push(node);
  expectedParents.push({ component: annotation.component, parent: null });
}

// SectionHeading title 복구 (발명이 아니라 pageName 사용)
for (const item of nodes) {
  if (item.component === 'SectionHeading' && !cleanText(item.content?.title)) {
    item.content.title = cleanText(prepared.pageName) || '페이지';
    warnings.push('SectionHeading.title이 비어 pageName으로 복구했습니다.');
  }
}

if (!nodes.some((item) => item.component === 'SectionHeading') && componentMap.SectionHeading) {
  nodes.unshift({
    component: 'SectionHeading',
    content: { title: cleanText(prepared.pageName) || '페이지', description: '' },
    children: [],
    options: [],
    items: [],
    actions: [],
  });
  warnings.push('SectionHeading 라벨이 없어 pageName으로 삽입했습니다.');
}

if (componentMap.Header) {
  nodes.unshift({ component: 'Header', content: {}, children: [], options: [], items: [], actions: [] });
}
if (componentMap.Footer) {
  const footerHint = resolvedPlan.find((item) => item.component === 'Footer');
  const footerAssigned = footerHint
    ? assignFromNearby('Footer', componentMap.Footer, parsePropsHint(footerHint.propsHint), footerHint.nearbyTexts || [])
    : { content: {} };
  nodes.push({
    component: 'Footer',
    content: footerAssigned.content || {},
    children: [],
    options: [],
    items: [],
    actions: [],
  });
}

function walkRequired(list) {
  for (const item of list) {
    const definition = componentMap[item.component] || {};
    for (const prop of definition.requiredProps || []) {
      if (prop.endsWith('Html')) continue;
      if (!cleanText(item.content?.[prop])) {
        warnings.push(`필수값 누락: ${item.component}.${prop}`);
      }
    }
    if (item.component === 'FormChoiceGroup' && !(item.options || []).length) {
      warnings.push('FormChoiceGroup.options 비어 있음');
    }
    if (item.component === 'FormTerms' && !(item.items || []).length) {
      warnings.push('FormTerms.items 비어 있음');
    }
    walkRequired(item.children || []);
  }
}
walkRequired(nodes);

const components = nodes.map((item, index) => ({ ...item, order: index + 1 }));
const flatCount = {};
function countFlat(list) {
  for (const item of list) {
    flatCount[item.component] = (flatCount[item.component] || 0) + 1;
    countFlat(item.children || []);
  }
}
countFlat(components);

const expectedCounts = {};
for (const annotation of resolvedPlan) {
  if (['Header', 'Footer'].includes(annotation.component)) continue;
  expectedCounts[annotation.component] = (expectedCounts[annotation.component] || 0) + 1;
}
const missingMappings = [];
for (const [name, count] of Object.entries(expectedCounts)) {
  const actual = flatCount[name] || 0;
  if (actual < count) missingMappings.push(`${name} ${actual}/${count}`);
}
if (missingMappings.length) {
  throw new Error('Figma 라벨 매핑 누락: ' + missingMappings.join(', '));
}

// 계층 불변식: FormButtonGroup/Notice/ImageText는 컨테이너 children이 될 수 없음
const hierarchyMismatches = [];
function assertHierarchy(list, parentName) {
  for (const item of list) {
    if (parentName && ['FormButtonGroup', 'Notice', 'ImageText', 'Breadcrumb', 'SectionHeading'].includes(item.component)) {
      hierarchyMismatches.push(`${item.component}는 ${parentName} 하위에 있으면 안 됩니다`);
    }
    if (item.component === 'FormButtonGroup' && parentName) {
      hierarchyMismatches.push('FormButtonGroup는 최상위 actions 슬롯이어야 합니다');
    }
    assertHierarchy(item.children || [], item.component);
  }
}
assertHierarchy(components, null);
if (hierarchyMismatches.length) {
  throw new Error('컴포넌트 계층 검증 실패: ' + [...new Set(hierarchyMismatches)].join('; '));
}

const runConfig = prepared.runConfig || (helpers && helpers.runConfig) || {};
const needsAiEnrichment = warnings.some((warning) => String(warning).startsWith('필수값 누락:'));

return [{
  json: {
    pageName: cleanText(prepared.pageName) || 'Figma Wireframe',
    components,
    warnings: [...new Set(warnings)],
    sourceNodeCount: prepared.nodeCount || 0,
    annotationCount: (prepared.annotations || []).length,
    annotatedComponents: [...new Set(resolvedPlan.map((item) => item.component))],
    generationMode: 'figma-tagged-deterministic-v2',
    hierarchy: expectedParents.filter((item) => !item.skipped),
    needsAiEnrichment,
    runConfig,
    outputHtmlPath: runConfig.outputHtmlPath || '/workspace/yuma-component-library/pages/new_page.html',
    outputReportPath: runConfig.outputReportPath || '/workspace/yuma-component-library/generated-figma-wireframe-report.json',
  },
}];

};
