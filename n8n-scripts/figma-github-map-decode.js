/**
 * GitHub Contents API 응답 → component-map JSON 디코드
 * + MCP 텍스트 추출 결과와 결합
 *
 * 입력 형태:
 * - { prepared, file }  (시안+맵 결합 노드)
 * - 또는 GitHub file JSON + helpers.prepared
 */
module.exports = function ($input, helpers) {
  const input = $input.first().json || {};
  const file = input.file && input.file.content ? input.file : input;

  let prepared = input.prepared || null;
  if (!prepared || (!prepared.mcpText && !Array.isArray(prepared.designNodes))) {
    prepared = (helpers && helpers.prepared) || null;
  }
  if (!prepared || (!prepared.mcpText && !Array.isArray(prepared.designNodes))) {
    if (helpers && typeof helpers.getJson === 'function') {
      prepared = helpers.getJson('MCP 텍스트 추출')
        || helpers.getJson('Figma 시안 구조 정리')
        || null;
    }
  }
  if (!prepared || (!prepared.mcpText && !Array.isArray(prepared.designNodes))) {
    const staticData = helpers && helpers.staticData;
    if (staticData && staticData.lastPrepared) prepared = staticData.lastPrepared;
  }

  if (!prepared || (!prepared.mcpText && !Array.isArray(prepared.designNodes))) {
    throw new Error(
      'MCP 텍스트 추출 결과가 없습니다. '
      + '실행 입력 → MCP Client → MCP 텍스트 추출 → GitHub map 순서를 확인하세요.'
    );
  }
  if (!file.content) {
    throw new Error('GitHub component-map 응답에 content가 없습니다.');
  }

  const decoded = Buffer.from(String(file.content).replace(/\n/g, ''), 'base64').toString('utf8');
  let extractedMap;
  try {
    extractedMap = JSON.parse(decoded);
  } catch (error) {
    throw new Error('component-map JSON 파싱 실패: ' + error.message);
  }

  const runConfig = prepared.runConfig || (helpers && helpers.runConfig) || {};
  return [{
    json: {
      prepared: {
        ...prepared,
        runConfig,
      },
      extractedMap,
      githubMapSha: file.sha || '',
      githubMapPath: file.path || 'component-map.json',
    },
  }];
};
