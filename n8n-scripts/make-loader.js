/**
 * n8n Code 노드용 로더.
 *
 * - makeHttpLoader: GitHub raw 등 URL에서 스크립트 fetch (서버 fs 불필요, 노드에 긴 코드 안 박음)
 * - makeExternalLoader: 로컬 /workspace/workflows/code/*.js (fs 필요)
 * - makeInlineCode: 빌드 시 인라인 (비권장 — 노드에 코드 박힘)
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_CODE_BASE =
  'https://raw.githubusercontent.com/donghobridge/figma-mcp-test/main/n8n-scripts';

const HELPERS_PREAMBLE = `function getJson(name) {
  try {
    const node = $(name);
    try {
      const j = node.first().json;
      if (j && typeof j === 'object') return j;
    } catch (_) {}
    try {
      const all = node.all();
      if (all && all[0] && all[0].json) return all[0].json;
    } catch (_) {}
  } catch (_) {}
  return undefined;
}

let staticData = {};
try {
  if (typeof $getWorkflowStaticData === 'function') {
    staticData = $getWorkflowStaticData('global') || {};
  }
} catch (_) {}

const helpers = {
  getJson,
  staticData,
  runConfig: getJson('실행 입력') || getJson('Figma 입력') || {},
  prepared: (function () {
    const fromExtract = getJson('MCP 텍스트 추출');
    if (fromExtract && (fromExtract.mcpText || fromExtract.designNodes)) return fromExtract;
    const combined = getJson('시안+맵 결합');
    if (combined && combined.prepared) return combined.prepared;
    return getJson('Figma 와이어프레임 정리') || getJson('Figma 시안 구조 정리') || staticData.lastPrepared || {};
  })(),
  extractedMap: (function () {
    const fromExtract = getJson('Extract component map');
    if (fromExtract && typeof fromExtract === 'object' && Object.keys(fromExtract).length) return fromExtract;
    const decoded = getJson('GitHub map 디코드');
    if (decoded && decoded.extractedMap) return decoded.extractedMap;
    const combined = getJson('시안+맵 결합');
    if (combined && combined.extractedMap) return combined.extractedMap;
    return {};
  })(),
  aiPatch: getJson('AI patch 적용') || {},
  pageSpec: getJson('page-spec 빌드') || getJson('AI page-spec 파싱') || getJson('AI HTML 파싱') || getJson('AI HTML 프롬프트') || {},
  libraryRoot: '/workspace/yuma-component-library',
};
`;

function makeHttpLoader(scriptFileName, options = {}) {
  const file = String(scriptFileName || '').replace(/[^A-Za-z0-9._-]/g, '');
  if (!file) throw new Error('scriptFileName required');
  const refreshPageSha = Boolean(options.refreshPageSha);

  const refreshBlock = refreshPageSha ? `
// PUT 직전 pages/{slug}.html blob SHA를 새로 조회 (stale/커밋SHA 오인 방지)
try {
  const cfg = helpers.runConfig || {};
  const owner = String(cfg.githubOwner || 'donghobridge').trim();
  const repo = String(cfg.githubRepo || 'figma-mcp-test').trim();
  const branch = String(cfg.githubBranch || 'main').trim() || 'main';
  let pageSlug = String(cfg.pageSlug || 'design-page').trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'design-page';
  try {
    const assembled = getJson('HTML 조립') || getJson('AI HTML 파싱') || {};
    if (assembled.pageSlug) pageSlug = String(assembled.pageSlug).trim() || pageSlug;
  } catch (_) {}
  const metaUrl = 'https://api.github.com/repos/' + owner + '/' + repo
    + '/contents/pages/' + encodeURIComponent(pageSlug) + '.html?ref=' + encodeURIComponent(branch);
  try {
    helpers.freshPageMeta = await this.helpers.httpRequest({
      method: 'GET',
      url: metaUrl,
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'n8n-figma-pagespec',
      },
    });
  } catch (error) {
    const status = Number(error && (error.statusCode || error.httpCode || error.status)) || 0;
    if (status === 404) {
      helpers.freshPageMeta = { message: 'Not Found', status: 404 };
    } else {
      helpers.freshPageMeta = null;
    }
  }
} catch (_) {
  helpers.freshPageMeta = null;
}
` : '';

  return `const base = String(($('실행 입력').first().json || {}).codeScriptsBaseUrl || '${DEFAULT_CODE_BASE}').replace(/\\/$/, '');
const scriptUrl = base + '/${file}' + '?v=' + Date.now();
const source = await this.helpers.httpRequest({
  method: 'GET',
  url: scriptUrl,
  encoding: 'text',
});
if (!source || typeof source !== 'string') {
  throw new Error('스크립트를 받지 못했습니다: ' + scriptUrl);
}
const mod = { exports: {} };
new Function('module', 'exports', 'require', source)(mod, mod.exports, require);
const run = mod.exports;
if (typeof run !== 'function') {
  throw new Error('Remote script must export a function($input, helpers): ' + scriptUrl);
}

${HELPERS_PREAMBLE}
${refreshBlock}
return run($input, helpers);`;
}

function makeExternalLoader(scriptFileName) {
  const file = String(scriptFileName || '').replace(/[^A-Za-z0-9._-]/g, '');
  if (!file) throw new Error('scriptFileName required');

  return `const fs = require('fs');
const scriptPath = '/workspace/workflows/code/${file}';
const source = fs.readFileSync(scriptPath, 'utf8');
const mod = { exports: {} };
new Function('module', 'exports', 'require', source)(mod, mod.exports, require);
const run = mod.exports;
if (typeof run !== 'function') {
  throw new Error('External script must export a function($input, helpers): ' + scriptPath);
}

${HELPERS_PREAMBLE}
return run($input, helpers);`;
}

function makeInlineCode(scriptFileName) {
  const file = String(scriptFileName || '').replace(/[^A-Za-z0-9._-]/g, '');
  if (!file) throw new Error('scriptFileName required');
  const scriptPath = path.join(__dirname, file);
  const source = fs.readFileSync(scriptPath, 'utf8');

  return `${HELPERS_PREAMBLE}
const __mod = { exports: {} };
new Function('module', 'exports', 'require', ${JSON.stringify(source)})(__mod, __mod.exports, require);
const __run = __mod.exports;
if (typeof __run !== 'function') {
  throw new Error('Inline script must export a function($input, helpers): ${file}');
}
return __run($input, helpers);`;
}

module.exports = { makeHttpLoader, makeExternalLoader, makeInlineCode, DEFAULT_CODE_BASE };
