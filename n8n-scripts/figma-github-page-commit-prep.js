/**
 * HTML 조립 결과 + 기존 파일 blob SHA → GitHub Contents API PUT 바디
 *
 * SHA는 반드시 Contents API의 type=file blob SHA만 사용.
 * (커밋 SHA / 다른 경로 SHA를 넣으면 409: is at X but expected Y)
 */
module.exports = function ($input, helpers) {
  const cfg = (helpers && helpers.runConfig) || {};
  let htmlItem = {};
  let existing = null;

  try {
    if (helpers && typeof helpers.getJson === 'function') {
      htmlItem = helpers.getJson('HTML 조립')
        || helpers.getJson('AI HTML 파싱')
        || {};
    }
  } catch (_) {}

  if (!htmlItem.html) {
    const incoming = $input.first().json || {};
    if (incoming.html) htmlItem = incoming;
  }

  const html = String(htmlItem.html || '');
  if (!html || !/<html[\s>]/i.test(html)) {
    throw new Error('조립 HTML이 없습니다. HTML 조립 결과를 확인하세요.');
  }

  const pageSlug = String(cfg.pageSlug || htmlItem.pageSlug || 'design-page')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'design-page';
  const branch = String(cfg.githubBranch || 'main').trim() || 'main';
  const owner = String(cfg.githubOwner || 'donghobridge').trim();
  const repo = String(cfg.githubRepo || 'figma-mcp-test').trim();
  const pathName = `pages/${pageSlug}.html`;
  const vercelBase = String(cfg.vercelBaseUrl || 'https://figma-mcp-test-nu.vercel.app').replace(/\/$/, '');
  const includeCount = htmlItem.includeCount || htmlItem.componentCount || 0;
  const mode = htmlItem.generationMode || 'pagespec-assemble';

  function isBlobFileMeta(meta, expectPath) {
    if (!meta || typeof meta !== 'object') return false;
    if (meta.message && !meta.sha) return false;
    if (meta.type !== 'file') return false;
    if (!/^[0-9a-f]{40}$/i.test(String(meta.sha || ''))) return false;
    if (meta.path && String(meta.path) !== expectPath) return false;
    // 커밋 객체를 오인한 경우 걸러냄 (commit tree/parents 등)
    if (meta.parents || meta.commit || meta.files) return false;
    return true;
  }

  // 1) 로더가 PUT 직전 새로 조회한 메타 우선
  if (isBlobFileMeta(helpers && helpers.freshPageMeta, pathName)) {
    existing = helpers.freshPageMeta;
  }

  // 2) sha 조회 노드
  if (!existing && helpers && typeof helpers.getJson === 'function') {
    const fromSha = helpers.getJson('GitHub 페이지 sha 조회');
    if (isBlobFileMeta(fromSha, pathName)) existing = fromSha;
  }

  // 3) $input (sha 조회 → 커밋 준비 연결일 때)
  if (!existing) {
    const incoming = $input.first().json || {};
    if (isBlobFileMeta(incoming, pathName)) existing = incoming;
  }

  const isUpdate = Boolean(existing);
  const content = Buffer.from(html, 'utf8').toString('base64');
  const nodeId = String(cfg.nodeId || htmlItem.sourceNodeId || '').trim();
  const body = {
    message: isUpdate
      ? `update(pages): ${pageSlug} via MCP ${mode} (nodeId=${nodeId || 'unknown'})`
      : `feat(pages): add ${pageSlug} via MCP ${mode} (nodeId=${nodeId || 'unknown'})`,
    content,
    branch,
  };
  if (isUpdate) body.sha = existing.sha;

  return [{
    json: {
      owner,
      repo,
      path: pathName,
      branch,
      pageSlug,
      previewUrl: `${vercelBase}/pages/${pageSlug}.html`,
      githubApiUrl: `https://api.github.com/repos/${owner}/${repo}/contents/${pathName}`,
      commitBody: body,
      pageName: htmlItem.pageName || pageSlug,
      componentCount: includeCount,
      generationMode: mode,
      warnings: htmlItem.warnings || [],
      sectionNames: htmlItem.sectionNames || [],
      usedBlobSha: isUpdate ? existing.sha : null,
      shaSource: isUpdate
        ? ((helpers && helpers.freshPageMeta && helpers.freshPageMeta.sha === existing.sha)
          ? 'fresh'
          : 'node')
        : 'create',
    },
  }];
};
