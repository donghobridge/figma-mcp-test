/**
 * Figma MCP 텍스트 + component-map → AI HTML 프롬프트.
 * include-only. 임의 마크업·플레이스홀더 금지.
 * few-shot에 구체 화면/문구를 넣지 않음 (복사 방지).
 */
module.exports = function ($input, helpers) {
  const inputJson = $input.first().json || {};
  const prepared = (inputJson.prepared && (inputJson.prepared.mcpText || inputJson.prepared.designNodes))
    ? inputJson.prepared
    : ((helpers && helpers.prepared) || {});
  const extractedMap = inputJson.extractedMap
    || (helpers && helpers.extractedMap)
    || {};
  const componentMap = extractedMap.data && typeof extractedMap.data === 'object'
    ? extractedMap.data
    : extractedMap;
  const runConfig = prepared.runConfig || (helpers && helpers.runConfig) || {};

  const mcpText = String(prepared.mcpText || '').trim();
  if (!mcpText) {
    throw new Error('MCP 텍스트가 없습니다. Figma MCP 조회 → 텍스트 추출을 확인하세요.');
  }
  if (!componentMap || typeof componentMap !== 'object' || !Object.keys(componentMap).length) {
    throw new Error('component-map이 비어 있습니다.');
  }

  const mcpLower = mcpText.toLowerCase();

  function toCatalogEntry(name, def) {
    return {
      path: def.path || '',
      figmaNames: def.figmaNames || [],
      props: def.props || [],
      textProps: def.textProps || [],
      requiredProps: def.requiredProps || [],
      slot: def.slot || def.role || '',
      role: def.role || '',
      description: def.description || '',
      variants: def.variants || [],
    };
  }

  // MCP 텍스트에 이름이 보이거나 header/footer 역할만 카탈로그에 넣음.
  // SummaryBar/GuideAccordion 등을 항상 넣으면 대출상환 레시피로 수렴함.
  const catalog = {};
  for (const [name, def] of Object.entries(componentMap)) {
    if (!def || typeof def !== 'object' || def.type === 'layout') continue;
    const role = String(def.role || def.slot || '');
    const names = [name, ...(def.figmaNames || []), ...(def.aliases || [])].map(String);
    const hitHeaderFooter = /header|footer|gnb/i.test(role) || /^(Header|Footer|GNB)$/i.test(name);
    const hitText = names.some((n) => n && mcpLower.includes(String(n).toLowerCase()));
    if (hitHeaderFooter || hitText) {
      catalog[name] = toCatalogEntry(name, def);
    }
  }

  // 너무 비면 전체(레이아웃 제외) 폴백 — 그래도 "항상 쓰는 페이지 세트"는 강제하지 않음
  if (Object.keys(catalog).length < 4) {
    for (const [name, def] of Object.entries(componentMap)) {
      if (!def || typeof def !== 'object' || def.type === 'layout') continue;
      catalog[name] = toCatalogEntry(name, def);
    }
  }

  const pageName = prepared.pageName || runConfig.pageSlug || 'Figma Design';
  const headerPath = (catalog.Header && catalog.Header.path)
    || (Object.values(catalog).find((c) => c.role === 'header' || c.slot === 'header') || {}).path
    || '/patterns/gnb.html';
  const footerPath = (catalog.Footer && catalog.Footer.path)
    || (Object.values(catalog).find((c) => c.role === 'footer' || c.slot === 'footer') || {}).path
    || '/patterns/footer.html';

  const sourceFileKey = String(runConfig.fileKey || prepared.sourceFileKey || '');
  const sourceNodeId = String(runConfig.nodeId || prepared.sourceNodeId || '');

  const prompt = `당신은 Yuma 포털 HTML 생성기입니다.
아래 Figma MCP 원문만 보고, component-map의 path로 include HTML을 만드세요.
다른 화면 예시·기억·추측 금지.

# 절대 금지
- 컴포넌트 마크업 직접 작성 금지 (class="summary-bar" 등)
- <table>, <dl>, <h1>~<h3> 본문 구성 금지
- include 중첩 금지 (form-card/key-value-card 안에 다른 data-include-path 넣지 말 것)
- MCP에 없는 문구·숫자·버튼·섹션 창작 금지
- "(MCP제목)", "정보(Data)", "TODO", "lorem", "샘플" 출력 금지
- head에서 import.css / import.js / common.js 생략 금지

# 문서 셸 (형식만. 본문은 MCP에 맞게 채움)
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageName}</title>
  <link rel="stylesheet" href="/import.css">
  <script defer src="/import.js"></script>
  <script defer src="/common.js"></script>
</head>
<body>
  <div data-include-path="/svg-symbols.html"></div>
  <div data-include-path="${headerPath}"></div>
  <div class="layout-page">
    <main class="layout-page__main">
      <!-- MCP 원문 순서대로 형제 include만. 예: -->
      <div data-include-path="/components/...." data-prop-...="MCP원문값"></div>
    </main>
  </div>
  <div data-include-path="${footerPath}"></div>
</body>
</html>

# include 문법
- 한 줄: <div data-include-path="map.path" data-prop-kebab="값"></div>
- camelCase prop → kebab-case (contentHtml → data-prop-content-html)
- 어떤 컴포넌트를 쓸지는 MCP 구조 + 아래 map만 보고 결정. 특정 화면 세트를 가정하지 말 것

# 이번 실행
pageName=${pageName}
fileKey=${sourceFileKey}
nodeId=${sourceNodeId}

# component-map (이 path/props만 사용)
${JSON.stringify(catalog, null, 2)}

# Figma MCP 원문 (유일한 출처)
${mcpText}

HTML만 출력하세요.`;

  return [{
    json: {
      prompt,
      preparedMeta: {
        pageName,
        mcpTextLength: mcpText.length,
        mcpTextHead: mcpText.slice(0, 240),
        sourceFileKey,
        sourceNodeId,
        warnings: prepared.warnings || [],
      },
      catalogComponentCount: Object.keys(catalog).length,
      runConfig,
      pageSlug: runConfig.pageSlug || 'design-page',
      mcpText,
    },
  }];
};
