/**
 * HTML 조립 결과 + (선택) 기존 파일 sha → GitHub Contents API PUT 바디
 */
module.exports = function ($input, helpers) {
  const cfg = (helpers && helpers.runConfig) || {};
  let htmlItem = {};
  let existing = $input.first().json || {};

  try {
    if (helpers && typeof helpers.getJson === 'function') {
      htmlItem = helpers.getJson('HTML 조립')
        || helpers.getJson('AI HTML 파싱')
        || {};
      const fromSha = helpers.getJson('GitHub 페이지 sha 조회');
      if (fromSha && (fromSha.sha || fromSha.message)) existing = fromSha;
    }
  } catch (_) {}

  if (!htmlItem.html) {
    htmlItem = $input.first().json || {};
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
  const isUpdate = Boolean(existing && existing.sha && existing.type === 'file');
  const mode = htmlItem.generationMode || 'pagespec-assemble';

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
    },
  }];
};
