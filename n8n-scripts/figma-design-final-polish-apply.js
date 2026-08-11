const fs = require('fs');
const prep = $('최종 개선 프롬프트').first().json || {};
const ai = $input.first().json || {};
const raw = String(ai.text || ai.output || ai.response || '').trim();
const warnings = [];

function stripFence(value) {
  let text = String(value || '').trim();
  if (text.startsWith('```')) {
    const firstNl = text.indexOf('\n');
    text = firstNl >= 0 ? text.slice(firstNl + 1) : text.replace(/^```[a-zA-Z]*/, '');
    if (text.endsWith('```')) text = text.slice(0, -3);
  }
  return text.trim();
}

function parseJson(value) {
  return JSON.parse(stripFence(value));
}

function mergePatches(suggestedList, llmList) {
  const map = new Map();
  function keyOf(patch) {
    const occ = Number.isInteger(patch.occurrence) ? patch.occurrence : patch.index;
    return String(patch.component || '') + '#' + String(occ);
  }
  for (const patch of suggestedList || []) {
    if (!patch || !patch.component) continue;
    map.set(keyOf(patch), {
      component: patch.component,
      occurrence: Number.isInteger(patch.occurrence) ? patch.occurrence : (
        Number.isInteger(patch.index) ? patch.index : 0
      ),
      content: { ...(patch.content || {}) },
    });
  }
  for (const patch of llmList || []) {
    if (!patch || !patch.component) continue;
    const key = keyOf(patch);
    const prev = map.get(key) || {
      component: patch.component,
      occurrence: Number.isInteger(patch.occurrence) ? patch.occurrence : (
        Number.isInteger(patch.index) ? patch.index : 0
      ),
      content: {},
    };
    for (const [prop, value] of Object.entries(patch.content || {})) {
      const text = String(value == null ? '' : value).trim();
      if (!text) continue;
      prev.content[prop] = text;
    }
    map.set(key, prev);
  }
  return Array.from(map.values()).filter((p) => Object.keys(p.content || {}).length);
}

let parsed = { propPatches: [], css: '', warnings: [] };
try {
  if (raw) parsed = parseJson(raw);
} catch (error) {
  warnings.push('LLM JSON 파싱 실패(무시하고 결정적 패치 적용): ' + error.message);
}
if (Array.isArray(parsed.warnings)) warnings.push(...parsed.warnings);

const patches = mergePatches(prep.suggestedPatches || [], parsed.propPatches || []);
const htmlPath = prep.htmlPath;
let html = '';
try {
  html = fs.readFileSync(htmlPath, 'utf8');
} catch (e) {
  return [{ json: { success: false, warnings: ['HTML 읽기 실패: ' + e.message], appliedProps: 0, cssWritten: false } }];
}

function dataKey(prop) {
  return String(prop).replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
}

function escapeAttr(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let appliedProps = 0;
let removedBlocks = 0;

// 1) 빈 CaseHeader / 오염 Breadcrumb include 제거
html = html.replace(
  /<!--\s*(CaseHeader|Breadcrumb)\s*:[^>]*-->\s*<div\b([^>]*)>\s*<\/div>/g,
  (full, component, attrs) => {
    const open = attrs || '';
    if (component === 'CaseHeader' && !/data-prop-/i.test(open)) {
      removedBlocks += 1;
      return '';
    }
    if (component === 'Breadcrumb') {
      const props = [...open.matchAll(/data-prop-item\d+="([^"]*)"/g)].map((m) => m[1]);
      const joined = props.join(' ');
      if (/(?:19|20)\d{2}[./-]\d{1,2}/.test(joined) || /보완요청|문의입니다/.test(joined) || props.some((p) => p.length >= 24)) {
        removedBlocks += 1;
        return '';
      }
    }
    return full;
  }
);

// 2) prop 패치 (occurrence = 같은 컴포넌트 N번째)
for (const patch of patches) {
  const component = String(patch.component || '').trim();
  const content = patch.content || {};
  if (!component || !content || typeof content !== 'object') continue;
  const occurrence = Number.isInteger(patch.occurrence) ? patch.occurrence : 0;

  const re = new RegExp(
    '(<!--\\s*' + escapeRegExp(component) + '\\s*:[^>]*-->\\s*)(<div\\b[^>]*data-include-path="[^"]+"[^>]*>)',
    'g'
  );
  let hit = 0;
  html = html.replace(re, (full, comment, openTag) => {
    if (hit !== occurrence) {
      hit += 1;
      return full;
    }
    hit += 1;
    let tag = openTag;
    for (const [key, value] of Object.entries(content)) {
      const text = String(value == null ? '' : value).trim();
      if (!text) continue;
      const attr = 'data-prop-' + dataKey(key);
      const attrRe = new RegExp(attr + '="[^"]*"');
      if (attrRe.test(tag)) {
        tag = tag.replace(attrRe, (m) => {
          const cur = (m.match(/="([^"]*)"/) || [])[1] || '';
          if (cur && cur !== 'TODO' && !/^notes?:/i.test(cur)) return m;
          appliedProps += 1;
          return attr + '="' + escapeAttr(text) + '"';
        });
      } else {
        tag = tag.replace(/>$/, ' ' + attr + '="' + escapeAttr(text) + '">');
        appliedProps += 1;
      }
    }
    return comment + tag;
  });
}

// 3) CSS: deterministic + LLM (짧을 때만)
let cssWritten = false;
let css = String(prep.deterministicCss || '').trim();
const llmCss = stripFence(parsed.css || '');
const forbiddenTag = new RegExp('</?(?:script|html|body)\\b', 'i');
const forbiddenImport = /@import\b/i;
if (llmCss && llmCss.length < 2500 && !forbiddenTag.test(llmCss) && !forbiddenImport.test(llmCss)) {
  css = (css ? css + '\n' : '') + '/* llm */\n' + llmCss;
}

if (css && !forbiddenTag.test(css) && !forbiddenImport.test(css)) {
  const pageKey = prep.pageKey || 'page';
  const candidates = [
    '/workspace/yuma-component-library/css/overrides/' + pageKey + '.css',
    '/Users/kang/Desktop/Tinto/n8n/figma-ai/yuma-component-library/css/overrides/' + pageKey + '.css',
  ];
  for (const p of candidates) {
    try {
      const dir = p.replace(/\/[^/]+$/, '');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, '/* final polish */\n' + css + '\n', 'utf8');
      cssWritten = true;
      break;
    } catch (_) {}
  }
  if (cssWritten) {
    const href = '/css/overrides/' + pageKey + '.css';
    if (!html.includes(href)) {
      html = html.replace(
        /(<link[^>]+import\.css"[^>]*>)/i,
        '$1\n  <link rel="stylesheet" href="' + href + '">'
      );
    }
  } else {
    warnings.push('페이지 scoped CSS 경로에 쓰지 못함');
  }
}

try {
  fs.writeFileSync(htmlPath, html, 'utf8');
} catch (e) {
  warnings.push('HTML 저장 실패: ' + e.message);
}

return [{
  json: {
    success: appliedProps > 0 || cssWritten || removedBlocks > 0,
    appliedProps,
    removedBlocks,
    cssWritten,
    patchCount: patches.length,
    emptySlotCount: prep.emptySlotCount || 0,
    snapshotCount: prep.snapshotCount || 0,
    warnings: [...new Set(warnings)],
    findingCount: (prep.audit && prep.audit.findingCount) || 0,
  },
}];
