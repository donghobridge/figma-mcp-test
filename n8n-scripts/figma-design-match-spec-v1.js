module.exports = function ($input, helpers) {
/**
 * Figma MCP prepare 결과 + component-map → page-spec
 *
 * 규칙만:
 * 1) 파란 [Component] 주석
 * 2) 레이어명 ↔ component-map (키 / figmaNames)
 * 3) map의 textProps / props / propTypes로 텍스트를 순서 채움
 *
 * 컴포넌트·화면별 예외 하드코딩 없음.
 */
const inputJson = $input.first().json || {};
const prepared = (inputJson.prepared && Array.isArray(inputJson.prepared.designNodes))
  ? inputJson.prepared
  : ((helpers && helpers.prepared) || {});
const extractedMap = inputJson.extractedMap
  || (helpers && helpers.extractedMap)
  || inputJson
  || {};
const componentMap = extractedMap.data && typeof extractedMap.data === 'object'
  ? extractedMap.data
  : extractedMap;

if (!prepared || !Array.isArray(prepared.designNodes)) {
  throw new Error(
    '시안 구조(designNodes)를 읽지 못했습니다. 「Figma 시안 구조 정리」와 「매칭 입력 결합」을 확인하세요.'
  );
}
if (!componentMap || typeof componentMap !== 'object' || !Object.keys(componentMap).length) {
  throw new Error('component-map이 비어 있습니다. Read/Extract component map을 확인하세요.');
}

const minMatchScore = Number(prepared.runConfig?.minMatchScore) || 70;
const warnings = Array.isArray(prepared.warnings) ? prepared.warnings.slice() : [];
const unmatched = [];
const matches = [];

function cleanText(value) {
  let text = String(value == null ? '' : value)
    .replace(/\{ts\d+\}|\{\/ts\d+\}/g, '')
    .replace(/\\+([*_()[\]])/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .trim();
  if (!text) return '';
  if (/^\{[^{}]+\}$/.test(text)) return '';
  if (/^LOGO(\s+PLACEHOLDER)?$/i.test(text)) return '';
  if (/^IMAGE$/i.test(text)) return '';
  if (/^[\s○●◎◯◉□■☐☑✓✔✕✖×><›‹·•‧∙_\-]+$/u.test(text)) return '';
  if (/^\[[A-Za-z][\w]*(?:\s*:[^\]]*)?\]$/.test(text)) return '';
  if (/^notes?\s*:/i.test(text)) return '';
  if (/^TODO\b/i.test(text)) return '';
  return text;
}

function isAnnotationNoise(text) {
  const t = String(text || '').trim();
  if (!t) return true;
  if (/^\[[A-Za-z][\w]*(?:\s*:[^\]]*)?\]$/.test(t)) return true;
  if (/\[[A-Za-z][\w]*(?:\s*:[^\]]*)?\]/.test(t) && t.length <= 40) return true;
  return false;
}

function usableTexts(list) {
  const seen = new Set();
  const out = [];
  for (const raw of list || []) {
    const text = cleanText(raw);
    if (!text || isAnnotationNoise(text) || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

function canonicalComponentName(rawName) {
  const raw = String(rawName || '').trim();
  if (!raw) return '';
  if (componentMap[raw]) return raw;
  const lower = raw.toLowerCase();
  for (const key of Object.keys(componentMap)) {
    if (key.toLowerCase() === lower) return key;
  }
  return '';
}

function buildMatchIndex(map) {
  const entries = [];
  for (const [name, definition] of Object.entries(map)) {
    if (!definition || typeof definition !== 'object') continue;
    if (definition.type === 'layout') continue;
    const aliases = new Set([name, ...(definition.aliases || []), ...(definition.figmaNames || [])]);
    for (const alias of aliases) {
      const raw = String(alias || '').trim();
      if (!raw) continue;
      entries.push({ component: name, alias: raw, norm: normalizeToken(raw), definition });
    }
  }
  return entries;
}

const SHORT_EXACT_TOKENS = new Set([
  'card', 'input', 'text', 'title', 'content', 'image', 'radio', 'check',
  'form', 'list', 'date', 'email', 'button', 'header', 'footer', 'name',
  'icon', 'logo', 'frame', 'group', 'area', 'item', 'box', 'row', 'table',
]);

function scoreName(figmaName, entry) {
  const raw = String(figmaName || '').trim();
  if (!raw) return 0;
  const norm = normalizeToken(raw);
  if (!norm) return 0;

  if (raw === entry.alias) return 100;
  if (raw.toLowerCase() === entry.alias.toLowerCase()) return 96;
  if (norm === entry.norm) return 92;

  const bracket = raw.match(/^\[\s*([A-Za-z][A-Za-z0-9]*)/);
  if (bracket) {
    const token = bracket[1];
    if (token === entry.component) return 98;
    if (normalizeToken(token) === entry.norm) return 94;
  }

  const fTokens = norm.split('-').filter(Boolean);
  const eTokens = entry.norm.split('-').filter(Boolean);
  if (!fTokens.length || !eTokens.length) return 0;
  if (eTokens.length === 1 && (eTokens[0].length <= 5 || SHORT_EXACT_TOKENS.has(eTokens[0]))) return 0;
  if (fTokens.length === 1 && (fTokens[0].length <= 5 || SHORT_EXACT_TOKENS.has(fTokens[0]))) return 0;
  if (eTokens.every((t) => fTokens.includes(t))) {
    return fTokens.length === eTokens.length ? 88 : 82;
  }
  return 0;
}

function bestMatch(figmaName, index) {
  let best = null;
  for (const entry of index) {
    const score = scoreName(figmaName, entry);
    if (!best || score > best.score) best = { ...entry, score };
  }
  if (!best || best.score < minMatchScore) return null;
  return best;
}

function filterSeedToDefinition(seeded, definition) {
  const allowed = new Set((definition && definition.props) || []);
  const out = {};
  for (const [key, value] of Object.entries(seeded || {})) {
    const text = cleanText(value);
    if (!text || isAnnotationNoise(text)) continue;
    if (allowed.size && !allowed.has(key)) continue;
    out[key] = text;
  }
  return out;
}

function mergeContent(target, source) {
  const out = { ...(target || {}) };
  for (const [key, value] of Object.entries(source || {})) {
    if (value == null || value === '') continue;
    if (!cleanText(out[key])) out[key] = value;
  }
  return out;
}

function collectNodeTexts(node) {
  return usableTexts([...(node.ownTexts || []), ...(node.childTexts || [])]);
}

/** map 정의만으로 props 채움 — 컴포넌트별 분기 없음 */
function assignProps(definition, texts, seeded = {}) {
  const content = { ...filterSeedToDefinition(seeded, definition) };
  const props = definition.props || [];
  const textProps = definition.textProps || props.filter((prop) => !prop.endsWith('Html') && !/href/i.test(prop));
  const propTypes = definition.propTypes || {};
  const pool = usableTexts(texts);
  const used = new Set();

  function take(predicate) {
    const index = pool.findIndex((text, i) => !used.has(i) && predicate(text, i));
    if (index < 0) return '';
    used.add(index);
    return pool[index];
  }

  for (const prop of textProps) {
    if (content[prop]) continue;
    const ptype = propTypes[prop];
    if (ptype === 'href') {
      content[prop] = '#';
      continue;
    }
    if (ptype === 'html') continue;
    if (ptype === 'file') {
      content[prop] = take((t) => /\.[a-z0-9]{2,6}$/i.test(t)) || '';
      continue;
    }
    if (ptype === 'phone') {
      content[prop] = take((t) => /0\d{1,2}-?\d{3,4}-?\d{4}/.test(t)) || '';
      continue;
    }
    if (ptype === 'date') {
      content[prop] = take((t) => /(?:19|20)\d{2}|\d{1,2}\s*월/.test(t)) || '';
      continue;
    }
    if (ptype === 'money') {
      content[prop] = take((t) => /\d[\d,]*\s*원/.test(t)) || '';
      continue;
    }
    if (/Value$/i.test(prop) || /Href$/i.test(prop)) {
      content[prop] = content[prop] || (/Href$/i.test(prop) ? '#' : '');
      continue;
    }
    content[prop] = take((t) => t.length <= 200) || '';
  }

  for (const prop of props) {
    if (content[prop] != null && content[prop] !== '') continue;
    if (propTypes[prop] === 'href' || /Href$/i.test(prop)) content[prop] = '#';
  }

  return { content, options: [], items: [], actions: [] };
}

const matchIndex = buildMatchIndex(componentMap);
const designNodes = prepared.designNodes || [];
const roots = [];
const containerStack = [];
const matchStack = [];

function popStacks(depth) {
  while (containerStack.length && containerStack[containerStack.length - 1].depth >= depth) {
    containerStack.pop();
  }
  while (matchStack.length && matchStack[matchStack.length - 1].depth >= depth) {
    matchStack.pop();
  }
}

function currentContainer() {
  return containerStack.length ? containerStack[containerStack.length - 1].item : null;
}

function findSameComponentAncestor(component) {
  for (let i = matchStack.length - 1; i >= 0; i -= 1) {
    if (matchStack[i].component === component) return matchStack[i];
  }
  return null;
}

function isWrapperName(name) {
  return /^(frame|group|section|container|wrapper|instance)/i.test(String(name || '').trim());
}

function resolveHit(node) {
  const rawName = String(node.name || '').trim();
  const canonical = canonicalComponentName(rawName);
  if (canonical && componentMap[canonical] && componentMap[canonical].type !== 'layout') {
    return {
      component: canonical,
      score: 100,
      definition: componentMap[canonical],
      seeded: filterSeedToDefinition((node.annotation && node.annotation.props) || {}, componentMap[canonical]),
      fromName: true,
    };
  }

  if (node.annotation?.component && componentMap[node.annotation.component]) {
    const definition = componentMap[node.annotation.component];
    return {
      component: node.annotation.component,
      score: 100,
      definition,
      fromAnnotation: true,
      seeded: filterSeedToDefinition(node.annotation.props || {}, definition),
    };
  }

  const nameHit = bestMatch(node.name, matchIndex);
  if (!nameHit) return null;
  return {
    component: nameHit.component,
    score: nameHit.score,
    definition: componentMap[nameHit.component] || nameHit.definition,
    seeded: filterSeedToDefinition((node.annotation && node.annotation.props) || {}, nameHit.definition),
  };
}

function attachItem(item, definition) {
  const parent = currentContainer();
  const nestable = definition.nestableInContainer === true;
  const acceptsChildren = definition.acceptsChildren === true;
  const depth = Number(item._depth) || 0;

  if (acceptsChildren) {
    if (parent) parent.children.push(item);
    else roots.push(item);
    containerStack.push({ item, depth });
    matchStack.push({ component: item.component, depth, item });
    return;
  }

  if (nestable && parent) parent.children.push(item);
  else if (parent && parent.component === 'FormCard' && definition.slot === 'content') parent.children.push(item);
  else roots.push(item);

  matchStack.push({ component: item.component, depth, item });
}

for (const node of designNodes) {
  const depth = Number(node.depth) || 0;
  popStacks(depth);

  const texts = collectNodeTexts(node);
  const hit = resolveHit(node);

  if (!hit) {
    if (node.type === 'INSTANCE' || node.type === 'COMPONENT' || (node.type === 'FRAME' && !isWrapperName(node.name))) {
      unmatched.push({ type: node.type, name: node.name, id: node.id || '' });
    }
    continue;
  }

  const definition = hit.definition || {};
  if (definition.role === 'header' || definition.role === 'footer') {
    matches.push({
      component: hit.component,
      score: hit.score,
      figmaName: node.name,
      nodeId: node.id,
      skippedRole: true,
      fromAnnotation: Boolean(hit.fromAnnotation),
    });
    continue;
  }

  const ancestor = findSameComponentAncestor(hit.component);
  if (ancestor) {
    const assigned = assignProps(definition, texts, hit.seeded);
    ancestor.item.content = mergeContent(ancestor.item.content, assigned.content);
    if (hit.score > (ancestor.item.matchScore || 0) && !isWrapperName(node.name)) {
      ancestor.item.figmaNode = node.name;
      ancestor.item.matchScore = hit.score;
      ancestor.item.sourceNodeId = node.id || ancestor.item.sourceNodeId;
    }
    matches.push({
      component: hit.component,
      score: hit.score,
      figmaName: node.name,
      nodeId: node.id,
      skippedDescendant: true,
    });
    matchStack.push({ component: hit.component, depth, item: ancestor.item });
    continue;
  }

  const assigned = assignProps(definition, texts, hit.seeded);
  const item = {
    component: hit.component,
    content: assigned.content,
    children: [],
    options: assigned.options,
    items: assigned.items,
    actions: assigned.actions,
    sourceNodeId: node.id || '',
    figmaNode: node.name,
    matchScore: hit.score,
    _depth: depth,
  };

  matches.push({
    component: hit.component,
    score: hit.score,
    figmaName: node.name,
    nodeId: node.id,
    fromAnnotation: Boolean(hit.fromAnnotation),
  });
  attachItem(item, definition);
}

function stripInternal(list) {
  return (list || []).map((item) => {
    const { _depth, ...rest } = item;
    return { ...rest, children: stripInternal(item.children || []) };
  });
}

let pruned = stripInternal(roots);

// map에 Header/Footer가 있으면 셸만 보정 (화면 내용 하드코딩 아님)
if (componentMap.Header && !pruned.some((item) => item.component === 'Header')) {
  pruned.unshift({ component: 'Header', content: {}, children: [], options: [], items: [], actions: [] });
}
if (componentMap.Footer && !pruned.some((item) => item.component === 'Footer')) {
  pruned.push({ component: 'Footer', content: {}, children: [], options: [], items: [], actions: [] });
}

const headerIdx = pruned.findIndex((item) => item.component === 'Header');
if (headerIdx > 0) {
  const [header] = pruned.splice(headerIdx, 1);
  pruned.unshift(header);
}

function walkRequired(list, path = []) {
  const gaps = [];
  for (let i = 0; i < (list || []).length; i += 1) {
    const item = list[i];
    const definition = componentMap[item.component] || {};
    const itemPath = path.concat([i]);
    for (const prop of definition.requiredProps || []) {
      if (prop.endsWith('Html')) continue;
      if (!cleanText(item.content?.[prop])) {
        const msg = `필수값 누락: ${item.component}.${prop}`;
        warnings.push(msg);
        gaps.push({
          component: item.component,
          prop,
          path: itemPath,
          figmaNode: item.figmaNode || '',
        });
      }
    }
    gaps.push(...walkRequired(item.children || [], itemPath.concat(['children'])));
  }
  return gaps;
}

const missingRequired = walkRequired(pruned);
for (const miss of unmatched.slice(0, 40)) {
  warnings.push(`미매칭 레이어: ${miss.type} "${miss.name}"`);
}

const components = pruned.map((item, index) => ({ ...item, order: index + 1 }));
const runConfig = prepared.runConfig || {};
const contentComponents = components.filter((item) => !['Header', 'Footer'].includes(item.component));
const annotatedMatchCount = matches.filter((m) => m.fromAnnotation && !m.skippedRole).length;
const annotationCount = prepared.annotationCount || annotatedMatchCount;

const quality = {
  pass: missingRequired.length === 0,
  missingRequired,
  annotationNoise: [],
  annotationCount,
  annotatedMatchCount,
  contentComponentCount: contentComponents.length,
  annotationCoverage: annotationCount
    ? Number((annotatedMatchCount / annotationCount).toFixed(2))
    : null,
  checks: [],
};
if (missingRequired.length) quality.checks.push(`필수값 누락 ${missingRequired.length}건`);

return [{
  json: {
    pageName: cleanText(prepared.pageName) || 'Figma Design',
    components,
    warnings: [...new Set(warnings)],
    matches,
    unmatched,
    quality,
    sourceNodeCount: prepared.nodeCount || 0,
    annotationCount,
    annotatedComponents: [...new Set(matches.map((m) => m.component))],
    generationMode: 'figma-design-map-match',
    hierarchy: matches
      .filter((m) => !m.skippedRole && !m.skippedDescendant)
      .map((m) => ({
        component: m.component,
        figmaName: m.figmaName,
        score: m.score,
        fromAnnotation: Boolean(m.fromAnnotation),
      })),
    needsAiEnrichment: missingRequired.length > 0,
    runConfig,
    outputHtmlPath: runConfig.outputHtmlPath || '/workspace/yuma-component-library/pages/design_page.html',
    outputReportPath: runConfig.outputReportPath || '/workspace/yuma-component-library/generated-figma-design-report.json',
  },
}];

};
