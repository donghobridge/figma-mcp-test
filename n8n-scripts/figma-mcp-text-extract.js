/**
 * Figma MCP 응답 → AI에 넘길 최소 텍스트만 추출.
 * 매칭/주석 파싱/하드코딩 없음.
 * 요청 nodeId와 MCP 응답 루트 노드가 다르면 실패 (잘못된 시안 유입 차단).
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

  function normalizeNodeId(id) {
    return String(id || '').trim().replace(/-/g, ':');
  }

  /** NODES 섹션 최상위(들여쓰기 없는) 프레임 id */
  function extractMcpRootNodeId(text) {
    const idx = text.search(/(?:^|\n)NODES:\s*\n/);
    const section = idx >= 0 ? text.slice(idx) : text;
    const lines = section.split('\n');
    for (const line of lines) {
      // 루트: 선행 공백 없이 [FRAME] ... #43:1801
      const m = line.match(/^\[(?:FRAME|INSTANCE|GROUP|COMPONENT|SECTION|PAGE)\][^\n]*#([0-9]+[:\-][0-9]+)/);
      if (m) return normalizeNodeId(m[1]);
    }
    // 폴백: 첫 번째 노드 id
    const any = section.match(/\[(?:FRAME|INSTANCE|GROUP|COMPONENT|SECTION|PAGE)\][^\n]*#([0-9]+[:\-][0-9]+)/);
    return any ? normalizeNodeId(any[1]) : '';
  }

  function mcpMentionsNode(text, nodeId) {
    if (!nodeId) return false;
    const colon = normalizeNodeId(nodeId);
    const hyphen = colon.replace(':', '-');
    return text.includes('#' + colon)
      || text.includes('#' + hyphen)
      || new RegExp('(?:^|\\D)' + colon.replace(':', '[:\\-]') + '(?:\\D|$)').test(text);
  }

  const fileKey = String(runConfig.fileKey || '').trim();
  const requestedNodeId = normalizeNodeId(runConfig.nodeId || '');
  const pageSlug = String(runConfig.pageSlug || '').trim();
  const mcpRootNodeId = extractMcpRootNodeId(rawText);

  const warnings = [];
  if (requestedNodeId && mcpRootNodeId && requestedNodeId !== mcpRootNodeId) {
    const mentioned = mcpMentionsNode(rawText, requestedNodeId);
    throw new Error(
      'MCP 응답 노드가 요청과 다릅니다.\n'
      + `요청 nodeId=${requestedNodeId}\n`
      + `MCP 루트 nodeId=${mcpRootNodeId}\n`
      + (mentioned
        ? '요청 id는 본문에 하위/컴포넌트로만 등장합니다.\n'
        : '요청 id가 MCP 본문에 없습니다.\n')
      + '→ MCP Client Input이 실행 입력.$json.nodeId를 쓰는지 확인하세요.\n'
      + '   Input: ={{ JSON.stringify({ fileKey: $json.fileKey, nodeId: $json.nodeId }) }}\n'
      + '   (하드코딩 43:1801 남아 있으면 계속 같은 시안이 나옵니다.)'
    );
  }
  if (requestedNodeId && !mcpRootNodeId) {
    warnings.push('MCP 루트 nodeId를 파싱하지 못함. NODES 섹션 형식을 확인하세요.');
  }

  // AI 컨텍스트 폭주 방지
  const maxChars = Number(runConfig.mcpTextMaxChars) || 60000;
  const mcpText = rawText.length > maxChars
    ? rawText.slice(0, maxChars) + '\n\n/* truncated */'
    : rawText;

  const pageName = String(runConfig.pageSlug || runConfig.pageName || 'Figma Design');

  const result = {
    pageName,
    mcpText,
    mcpTextLength: mcpText.length,
    mcpTextHead: mcpText.slice(0, 240),
    sourceFileKey: fileKey,
    sourceNodeId: requestedNodeId,
    mcpRootNodeId,
    nodeIdMatch: Boolean(requestedNodeId && mcpRootNodeId && requestedNodeId === mcpRootNodeId),
    generationMode: 'ai-html-direct',
    warnings,
    designNodes: [{ id: 'mcp', depth: 0, type: 'DOCUMENT', name: pageName, ownTexts: [] }],
    runConfig: {
      ...runConfig,
      fileKey,
      nodeId: requestedNodeId,
      pageSlug,
      githubOwner: runConfig.githubOwner || '',
      githubRepo: runConfig.githubRepo || '',
      githubBranch: runConfig.githubBranch || 'main',
      vercelBaseUrl: runConfig.vercelBaseUrl || '',
    },
  };

  try {
    if (helpers && helpers.staticData && typeof helpers.staticData === 'object') {
      helpers.staticData.lastPrepared = result;
    }
  } catch (_) {}

  return [{ json: result }];
};
