/**
 * Figma MCP 응답 → AI에 넘길 최소 텍스트만 추출.
 * 매칭/주석 파싱/하드코딩 없음.
 */
module.exports = function ($input, helpers) {
  const input = $input.first().json || {};
  const runConfig = (helpers && helpers.runConfig) || {};

  let rawText = '';
  if (Array.isArray(input.content)) {
    const textItem = input.content.find((item) => item.type === 'text');
    rawText = textItem && textItem.text ? String(textItem.text) : '';
  }
  if (!rawText && typeof input.text === 'string') rawText = input.text;
  if (!rawText && typeof input === 'string') rawText = input;

  rawText = String(rawText || '')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .trim();

  if (!rawText) {
    throw new Error('Figma MCP 결과에 텍스트가 없습니다. MCP Client / fileKey / nodeId를 확인하세요.');
  }

  // AI 컨텍스트 폭주 방지
  const maxChars = Number(runConfig.mcpTextMaxChars) || 60000;
  const mcpText = rawText.length > maxChars
    ? rawText.slice(0, maxChars) + '\n\n/* truncated */'
    : rawText;

  const pageName = String(runConfig.pageSlug || runConfig.pageName || 'Figma Design');

  return [{
    json: {
      pageName,
      mcpText,
      mcpTextLength: mcpText.length,
      generationMode: 'ai-html-direct',
      warnings: [],
      // AI 프롬프트 호환: designNodes 대신 mcpText 사용
      designNodes: [{ id: 'mcp', depth: 0, type: 'DOCUMENT', name: pageName, ownTexts: [] }],
      runConfig: {
        ...runConfig,
        fileKey: runConfig.fileKey || '',
        nodeId: runConfig.nodeId || '',
        pageSlug: runConfig.pageSlug || '',
        githubOwner: runConfig.githubOwner || '',
        githubRepo: runConfig.githubRepo || '',
        githubBranch: runConfig.githubBranch || 'main',
        vercelBaseUrl: runConfig.vercelBaseUrl || '',
      },
    },
  }];
};
