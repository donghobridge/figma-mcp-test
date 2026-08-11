/**
 * GitHub Contents API 응답 → component-map JSON 디코드
 * + MCP 텍스트 추출 결과와 결합
 */
module.exports = function ($input, helpers) {
  const file = $input.first().json || {};
  const prepared = (helpers && helpers.prepared)
    || (helpers && helpers.getJson && (
      helpers.getJson('MCP 텍스트 추출')
      || helpers.getJson('Figma 시안 구조 정리')
    ))
    || {};

  if (!prepared || (!prepared.mcpText && !Array.isArray(prepared.designNodes))) {
    throw new Error('MCP 텍스트 추출 결과가 없습니다.');
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
