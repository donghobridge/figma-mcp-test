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
- "정보(Data)", "TODO", "lorem", "placeholder", "샘플" 같은 더미 값 금지
- MCP에 없는 문장·필드 창작 금지
- 마크다운/설명 출력 금지

# 필수 출력 형식
<!DOCTYPE html> … </html> 만.
본문 컴포넌트는 전부 한 줄 include:
<div data-include-path="/components/....html" data-prop-title="실제값" data-prop-label1="실제값"></div>
prop 이름: camelCase → kebab-case (contentHtml → data-prop-content-html)

# 올바른 예시 (이 스타일만 사용)
<div data-include-path="/svg-symbols.html"></div>
<div data-include-path="${headerPath}"></div>
<div class="layout-page">
  <main class="layout-page__main">
    <div data-include-path="/components/section-heading.html" data-prop-title="대출상환 신청"></div>
    <div data-include-path="/components/guide-accordion.html" data-prop-title="유의사항" data-prop-content-html="안내 문장<br>다음 문장"></div>
    <div data-include-path="/components/summary-bar.html" data-prop-label1="현재 대출잔액" data-prop-value1="1,000,000원" data-prop-label2="상환금액" data-prop-value2="600,000원" data-prop-label3="최종 대출잔액" data-prop-value3="400,000원" data-prop-variant-class="ui-summary-bar--stack"></div>
    <div data-include-path="/components/key-value-card.html" data-prop-title="신청내역" data-prop-label1="상환방법" data-prop-value1="MCP에 있는 실제값" data-prop-label2="대출잔액" data-prop-value2="MCP에 있는 실제값"></div>
    <div data-include-path="/components/form-button-group.html" data-prop-secondary-label="이전" data-prop-primary-label="신청하기"></div>
  </main>
</div>
<div data-include-path="${footerPath}"></div>

# 매핑 힌트
- 유의사항/아코디언 → GuideAccordion (title + contentHtml)
- 잔액/금액 3칸 요약 → SummaryBar (labelN/valueN, label=항목명 value=금액)
- Table_A / 신청내역 / 반복 행 → KeyValueCard 하나 (label1/value1 … 최대 12). 행마다 테이블 만들지 말 것
- 이전/신청하기 버튼 → FormButtonGroup
- 페이지 제목 → SectionHeading (path: /components/section-heading.html)

# pageName
${pageName}

# component-map (이 path/props만 사용)
${JSON.stringify(catalog, null, 2)}

# Figma MCP 원문 (값의 유일한 출처)
${mcpText}

위 규칙으로 include-only HTML만 출력하세요.`;

  return [{
    json: {
      prompt,
      preparedMeta: {
        pageName,
        mcpTextLength: mcpText.length,
        warnings: prepared.warnings || [],
      },
      catalogComponentCount: Object.keys(catalog).length,
      runConfig,
      pageSlug: runConfig.pageSlug || 'design-page',
    },
  }];
};
