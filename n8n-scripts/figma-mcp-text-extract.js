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

  const fileKey = String(runConfig.fileKey || '').trim();
  const nodeId = String(runConfig.nodeId || '').trim();
  const pageSlug = String(runConfig.pageSlug || '').trim();

  const result = {
    pageName,
    mcpText,
    mcpTextLength: mcpText.length,
    // n8n에서 노드가 바뀌었는지 바로 확인용
    mcpTextHead: mcpText.slice(0, 240),
    sourceFileKey: fileKey,
    sourceNodeId: nodeId,
    generationMode: 'ai-html-direct',
    warnings: [],
    designNodes: [{ id: 'mcp', depth: 0, type: 'DOCUMENT', name: pageName, ownTexts: [] }],
    runConfig: {
      ...runConfig,
      fileKey,
      nodeId,
      pageSlug,
      githubOwner: runConfig.githubOwner || '',
      githubRepo: runConfig.githubRepo || '',
      githubBranch: runConfig.githubBranch || 'main',
      vercelBaseUrl: runConfig.vercelBaseUrl || '',
    },
  };

  // HTTP 노드 뒤에서 $('MCP 텍스트 추출')이 깨질 수 있어 staticData에도 보관
  try {
    if (helpers && helpers.staticData && typeof helpers.staticData === 'object') {
      helpers.staticData.lastPrepared = result;
    }
  } catch (_) {}

  return [{ json: result }];
};
