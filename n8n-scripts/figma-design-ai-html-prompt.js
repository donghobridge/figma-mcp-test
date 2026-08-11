/**
 * Figma MCP 텍스트 + component-map → AI HTML 프롬프트.
 * include-only. 임의 마크업·플레이스홀더 금지.
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
  const preferred = new Set([
    'SectionHeading',
    'PageTitle',
    'SummaryBar',
    'KeyValueCard',
    'GuideAccordion',
    'FormButtonGroup',
    'Button',
    'Header',
    'Footer',
    'GNB',
  ]);

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

  const catalog = {};
  for (const [name, def] of Object.entries(componentMap)) {
    if (!def || typeof def !== 'object' || def.type === 'layout') continue;
    const role = String(def.role || def.slot || '');
    const names = [name, ...(def.figmaNames || []), ...(def.aliases || [])].map(String);
    const hitPreferred = preferred.has(name) || /header|footer/i.test(role);
    const hitText = names.some((n) => n && mcpLower.includes(String(n).toLowerCase()));
    if (hitPreferred || hitText) {
      catalog[name] = toCatalogEntry(name, def);
    }
  }

  // 너무 줄었으면 전체 카탈로그(레이아웃 제외)로 폴백
  if (Object.keys(catalog).length < 8) {
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

  const prompt = `당신은 Yuma 포털 HTML 생성기입니다.
Figma MCP 원문의 텍스트만 값으로 쓰고, component-map path만 include로 조립하세요.

# 절대 금지 (위반 시 실패)
- class="guide-accordion" / class="summary-bar" / class="data-table" / class="ui-kv-card" 등 컴포넌트 마크업을 직접 작성 금지
- <table>, <dl>, <h1>~<h3>로 본문 구성 금지 (제목도 SectionHeading include)
- form-card / key-value-card 안에 다른 data-include-path를 자식으로 넣지 말 것 (include 호스트는 자식을 버림)
- question-content로 KV 행을 쪼개지 말 것 → KeyValueCard의 labelN/valueN만 사용
- "정보(Data)", "TODO", "lorem", "placeholder", "샘플" 같은 더미 값 금지
- MCP에 없는 문장·필드 창작 금지
- 마크다운/설명 출력 금지
- head에서 import.css / import.js / common.js 생략 금지 (생략하면 빈 화면)

# 문서 셸 형식 (형식만 참고. 본문 문구/필드/컴포넌트 종류는 MCP 원문을 따름. 아래 예시 문구 복사 금지)
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
      <!-- 형제 include만. 중첩 금지. prop 값은 전부 MCP 원문에서 -->
      <div data-include-path="/components/section-heading.html" data-prop-title="(MCP제목)"></div>
      <div data-include-path="/components/guide-accordion.html" data-prop-title="(MCP안내제목)" data-prop-content-html="(MCP안내본문)"></div>
      <div data-include-path="/components/summary-bar.html" data-prop-label1="(MCP라벨)" data-prop-value1="(MCP값)" data-prop-variant-class="ui-summary-bar--stack"></div>
      <div data-include-path="/components/key-value-card.html" data-prop-title="(MCP카드제목)" data-prop-label1="(MCP라벨)" data-prop-value1="(MCP값)"></div>
      <div data-include-path="/components/form-button-group.html" data-prop-secondary-label="(MCP버튼)" data-prop-primary-label="(MCP버튼)"></div>
    </main>
  </div>
  <div data-include-path="${footerPath}"></div>
</body>
</html>

# 규칙
- MCP 원문에 없는 화면(예: 대출상환)을 만들지 말 것. 예시 HTML의 문구를 그대로 쓰지 말 것
- MCP에 있는 섹션/라벨/값/버튼만 include로 조립. 없는 컴포넌트는 넣지 말 것
- 본문 컴포넌트는 전부 한 줄 include (자식 없음)
- prop 이름: camelCase → kebab-case (contentHtml → data-prop-content-html)
- 라벨+값 반복 행 → KeyValueCard 하나 (label1/value1 … 최대 12)
- 접이식 안내/유의사항 문구가 있으면 → GuideAccordion
- 금액/수치 요약 줄이 있으면 → SummaryBar
- 하단 이전/다음/신청 버튼이 있으면 → FormButtonGroup

# pageName / nodeId (이번 실행)
pageName=${pageName}
fileKey=${runConfig.fileKey || ''}
nodeId=${runConfig.nodeId || ''}

# component-map (이 path/props만 사용)
${JSON.stringify(catalog, null, 2)}

# Figma MCP 원문 (값·구조의 유일한 출처 — 이것만 반영)
${mcpText}

위 셸 형식으로, MCP 원문에 맞는 include-only HTML만 출력하세요.`;

  return [{
    json: {
      prompt,
      preparedMeta: {
        pageName,
        mcpTextLength: mcpText.length,
        mcpTextHead: mcpText.slice(0, 240),
        sourceFileKey: runConfig.fileKey || prepared.sourceFileKey || '',
        sourceNodeId: runConfig.nodeId || prepared.sourceNodeId || '',
        warnings: prepared.warnings || [],
      },
      catalogComponentCount: Object.keys(catalog).length,
      runConfig,
      pageSlug: runConfig.pageSlug || 'design-page',
    },
  }];
};
