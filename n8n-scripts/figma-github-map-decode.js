/**
 * GitHub map 응답 → extractedMap + MCP prepared 결합
 *
 * 지원 입력:
 * - raw JSON component-map (keys = 컴포넌트명)
 * - Contents API { content: base64, ... }
 * - { prepared, file } / { prepared, extractedMap }
 */
module.exports = function ($input, helpers) {
  const input = $input.first().json || {};

  let prepared = input.prepared || null;
  if (!prepared || (!prepared.mcpText && !Array.isArray(prepared.designNodes))) {
    prepared = (helpers && helpers.prepared) || null;
  }
  if (!prepared || (!prepared.mcpText && !Array.isArray(prepared.designNodes))) {
    if (helpers && typeof helpers.getJson === 'function') {
      prepared = helpers.getJson('MCP 텍스트 추출') || null;
    }
  }
  if (!prepared || (!prepared.mcpText && !Array.isArray(prepared.designNodes))) {
    const staticData = helpers && helpers.staticData;
    if (staticData && staticData.lastPrepared) prepared = staticData.lastPrepared;
  }
  if (!prepared || (!prepared.mcpText && !Array.isArray(prepared.designNodes))) {
    throw new Error(
      'MCP 텍스트 추출 결과가 없습니다. '
      + '실행 입력 → MCP Client → MCP 텍스트 추출 연결을 확인하세요.'
    );
  }

  let extractedMap = input.extractedMap || null;
  const file = input.file || input;

  if (!extractedMap) {
    if (file && file.content && (file.encoding === 'base64' || file.type === 'file')) {
      const decoded = Buffer.from(String(file.content).replace(/\n/g, ''), 'base64').toString('utf8');
      try {
        extractedMap = JSON.parse(decoded);
      } catch (error) {
        throw new Error('component-map JSON 파싱 실패: ' + error.message);
      }
    } else if (file && typeof file === 'object' && !file.message) {
      // raw.githubusercontent.com JSON → n8n이 객체로 펼친 경우
      const keys = Object.keys(file);
      if (keys.length && (file.PageLayout || file.KeyValueCard || file.SummaryBar || file.GuideAccordion)) {
        extractedMap = file;
      }
    }
  }

  if (!extractedMap || typeof extractedMap !== 'object' || !Object.keys(extractedMap).length) {
    const hint = file && file.message
      ? ('GitHub 메시지: ' + file.message)
      : ('응답 keys: ' + Object.keys(file || {}).slice(0, 12).join(','));
    throw new Error('component-map을 읽지 못했습니다. ' + hint);
  }

  const runConfig = prepared.runConfig || (helpers && helpers.runConfig) || {};
  return [{
    json: {
      prepared: {
        ...prepared,
        runConfig,
      },
      extractedMap,
      githubMapSha: (file && file.sha) || '',
      githubMapPath: (file && file.path) || 'component-map.json',
    },
  }];
};
