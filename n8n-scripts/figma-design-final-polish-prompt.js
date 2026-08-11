const fs = require('fs');
const cfg = $('실행 입력').first().json || {};
const audit = $input.first().json || {};
let pageSpec = {};
try {
  pageSpec = $('AI page-spec 파싱').first().json || {};
} catch (_) {
  try {
    pageSpec = $('시안 page-spec 매칭').first().json || {};
  } catch (__) {}
}

let prepared = {};
try {
  prepared = $('Figma 시안 구조 정리').first().json || {};
} catch (_) {}

const htmlPath = cfg.outputHtmlPath || '/workspace/yuma-component-library/pages/design_page.html';
let html = '';
try {
  html = fs.readFileSync(htmlPath, 'utf8');
} catch (_) {}

function cleanText(value) {
  return String(value == null ? '' : value)
    .replace(/\s+/g, ' ')
    .trim();
}

function isNoiseText(value) {
  const text = cleanText(value);
  if (!text) return true;
  if (/^notes?:/i.test(text) || /^TODO\b/i.test(text)) return true;
  if (/^\[/.test(text) && /\]/.test(text) && text.length < 80) return true;
  if (/설계\s*명세|specification|props\s*:/i.test(text)) return true;
  if (text === '>' || text === '|' || text === '/') return true;
  return false;
}

function emptyPropsOf(content) {
  const out = [];
  for (const [key, value] of Object.entries(content || {})) {
    if (!cleanText(value) || cleanText(value) === 'TODO' || /^notes?:/i.test(cleanText(value))) {
      out.push(key);
    }
  }
  return out;
}

const designNodes = Array.isArray(prepared.designNodes) ? prepared.designNodes : [];
const textNodes = Array.isArray(prepared.textNodes) ? prepared.textNodes : [];
const textStyleSnapshot = Array.isArray(prepared.textStyleSnapshot)
  ? prepared.textStyleSnapshot
  : textNodes
    .filter((t) => !isNoiseText(t.text))
    .map((t) => ({
      text: String(t.text).slice(0, 120),
      color: t.color || '',
      fontSize: t.fontSize,
      fontWeight: t.fontWeight,
    }))
    .slice(0, 120);
const colorPalette = Array.isArray(prepared.colorPalette) ? prepared.colorPalette : [];

function textsForNode(nodeId, figmaNode) {
  let node = null;
  if (nodeId) node = designNodes.find((n) => String(n.id) === String(nodeId));
  if (!node && figmaNode) {
    node = designNodes.find((n) => String(n.name) === String(figmaNode));
  }
  if (!node) return [];

  const next = designNodes.find((other) => other.order > node.order && other.depth <= node.depth);
  const endOrder = next ? next.order : Number.POSITIVE_INFINITY;
  const fromStyled = textNodes
    .filter((t) => t.order > node.order && t.order < endOrder && t.depth > node.depth)
    .filter((t) => !isNoiseText(t.text))
    .map((t) => ({
      text: cleanText(t.text).slice(0, 120),
      color: t.color || '',
      fontSize: t.fontSize,
      fontWeight: t.fontWeight,
    }));
  if (fromStyled.length) return fromStyled.slice(0, 24);

  return []
    .concat(node.ownTexts || [], node.childTexts || [])
    .map((t) => cleanText(t))
    .filter((t) => !isNoiseText(t))
    .slice(0, 24)
    .map((text) => ({ text, color: '', fontSize: null, fontWeight: null }));
}

function suggestContent(component, emptyKeys, nearby) {
  const pool = nearby.map((t) => t.text).filter(Boolean);
  const used = new Set();
  const content = {};

  function take(predicate) {
    const index = pool.findIndex((text, i) => !used.has(i) && predicate(text, i));
    if (index < 0) return '';
    used.add(index);
    return pool[index];
  }

  if (component === 'CaseHeader') {
    if (emptyKeys.includes('date')) {
      content.date = take((t) => /(?:19|20)\d{2}[./-]\d{1,2}/.test(t));
    }
    if (emptyKeys.includes('title')) {
      content.title = take((t) => /^\[[^\]]+\]/.test(t))
        || take((t) => /문의|요청/.test(t) && t.length >= 8 && t.length <= 100)
        || take((t) => t.length >= 10 && t.length <= 100 && !/(?:19|20)\d{2}/.test(t));
    }
    if (emptyKeys.includes('badge1')) {
      content.badge1 = take((t) => t.length <= 24 && !/^\[/.test(t) && !/(?:19|20)\d{2}/.test(t));
    }
    if (emptyKeys.includes('badge2')) {
      content.badge2 = take((t) => t.length <= 24 && !/^\[/.test(t) && !/(?:19|20)\d{2}/.test(t));
    }
  } else if (component === 'Breadcrumb') {
    emptyKeys.forEach((key) => {
      if (!/^item\d+$/.test(key)) return;
      const hit = take((t) => t.length <= 20 && !/(?:19|20)\d{2}/.test(t) && !/보완요청/.test(t));
      if (hit) content[key] = hit;
    });
  } else if (component === 'ContactBar') {
    if (emptyKeys.includes('phone')) {
      content.phone = take((t) => /0\d{1,2}-?\d{3,4}-?\d{4}/.test(t));
    }
    if (emptyKeys.includes('category')) {
      content.category = take((t) => t.length <= 40 && !/0\d{1,2}-/.test(t));
    }
  } else if (component === 'SectionHeading' || component === 'QuestionContent' || component === 'AnswerPanel') {
    if (emptyKeys.includes('title')) {
      content.title = take((t) => t.length >= 4 && t.length <= 80);
    }
    const bodyKey = emptyKeys.find((k) => /description|body|message/.test(k));
    if (bodyKey) content[bodyKey] = take((t) => t.length >= 8);
  } else {
    for (const key of emptyKeys) {
      if (/href|Html$/i.test(key)) continue;
      const hit = take((t) => t.length >= 2 && t.length <= 80);
      if (hit) content[key] = hit;
    }
  }

  Object.keys(content).forEach((key) => {
    if (!cleanText(content[key])) delete content[key];
  });
  return content;
}

const components = Array.isArray(pageSpec.components) ? pageSpec.components : [];
const emptySlots = [];
const suggestedPatches = [];
const occurrenceByComponent = {};

components.forEach((c, index) => {
  const name = c.component;
  const occurrence = occurrenceByComponent[name] || 0;
  occurrenceByComponent[name] = occurrence + 1;

  const emptyKeys = emptyPropsOf(c.content);
  if (!emptyKeys.length) return;
  const nearby = textsForNode(c.sourceNodeId, c.figmaNode);
  const pool = nearby.length
    ? nearby
    : textStyleSnapshot.map((t) => ({
      text: t.text,
      color: t.color || '',
      fontSize: t.fontSize,
      fontWeight: t.fontWeight,
    }));
  emptySlots.push({
    index,
    occurrence,
    component: name,
    figmaNode: c.figmaNode || '',
    emptyKeys,
    nearbyTexts: nearby.slice(0, 12),
  });
  const suggested = suggestContent(name, emptyKeys, pool);
  if (Object.keys(suggested).length) {
    suggestedPatches.push({ component: name, occurrence, content: suggested });
  }
});

const findings = Array.isArray(audit.findings) ? audit.findings : [];
const dark = colorPalette.find((c) => /^#([0-2][0-9A-Fa-f]{5}|000|111|222|333)$/i.test(c)) || '#23272b';
const muted = colorPalette.find((c) => /^#(6B7280|9CA3AF|848E9A)$/i.test(c)) || '#6B7280';
const titleColor = colorPalette.find((c) => /^#(111827|1F2937|111111)$/i.test(c)) || '#111827';

const deterministicCss = [
  '/* deterministic polish — 자문위원 상세 시안 */',
  '.ui-breadcrumb span:empty{display:none}',
  '.layout-detail__header .ui-breadcrumb{display:inline-flex;align-items:center;gap:6px;color:#111;font-size:1.8rem;font-weight:700}',
  '.layout-detail__header .ui-breadcrumb span:first-child::before{content:"<";margin-right:8px;font-weight:700}',
  '.portal-case-header__status{color:#e85d04;font-weight:700}',
  '.portal-case-header__title{color:' + titleColor + ';font-weight:700}',
  '.portal-case-header__date,.ui-breadcrumb,.portal-answer__notice time{color:' + muted + '}',
  '.layout-detail__actions{display:flex;justify-content:center;padding:28px 0 8px}',
  '.layout-detail__actions .ui-button{min-width:200px;min-height:52px;border-radius:12px;background:' + dark + ' !important;color:#fff !important;border-color:' + dark + ' !important;font-weight:700}',
].join('\n');

// LLM에는 짧은 입력만 — HTML 전문/장문 금지 (JSON 절단 방지)
const prompt = [
  'Yuma 포털 page-scoped CSS만 JSON으로 반환하세요.',
  'propPatches는 비워 두세요. 텍스트는 이미 결정적으로 적용합니다.',
  '시안 팔레트 색만 사용. 레이아웃/선택자 광범위 금지.',
  '응답 예: {"propPatches":[],"css":".portal-case-header__title{color:#111827}","warnings":[]}',
  '',
  'colorPalette: ' + JSON.stringify(colorPalette.slice(0, 12)),
  'findings: ' + JSON.stringify(findings.slice(0, 20)),
  'emptySlotCount: ' + String(emptySlots.length),
  'titleSample: ' + JSON.stringify(textStyleSnapshot.filter((t) => t.fontSize && t.fontSize >= 18).slice(0, 8)),
].join('\n');

return [{
  json: {
    prompt,
    htmlPath,
    pageKey: String(htmlPath).split('/').pop().replace(/\.html?$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'page',
    audit,
    suggestedPatches,
    deterministicCss,
    emptySlotCount: emptySlots.length,
    snapshotCount: textStyleSnapshot.length,
    colorPalette,
  },
}];
