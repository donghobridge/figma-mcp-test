/**
 * Figma MCP → AI HTML 프롬프트.
 * 이 시안(상담 상세) 기준 구조: yuma-component-library design_page02
 *   layout-page → layout-page__container → layout-detail__surface(흰 카드)
 *   + portal-* / components include
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
    throw new Error('MCP 텍스트가 없습니다.');
  }
  if (!componentMap || typeof componentMap !== 'object' || !Object.keys(componentMap).length) {
    throw new Error('component-map이 비어 있습니다.');
  }

  function entry(name, def) {
    return {
      path: def.path || '',
      props: def.props || [],
      textProps: def.textProps || [],
      figmaNames: def.figmaNames || [],
      role: def.role || def.slot || '',
    };
  }

  const preferred = [
    'CaseHeader', 'ContactBar', 'AttachmentList', 'QuestionContent',
    'AnswerPanel', 'Button', 'Header', 'Footer', 'GNB', 'Breadcrumb',
    'SectionHeading', 'FormButtonGroup', 'SummaryBar', 'KeyValueCard',
    'GuideAccordion', 'ApplicationDateCard',
  ];
  const catalog = {};
  for (const name of preferred) {
    if (componentMap[name]) catalog[name] = entry(name, componentMap[name]);
  }
  for (const [name, def] of Object.entries(componentMap)) {
    if (catalog[name] || !def || def.type === 'layout') continue;
    const names = [name, ...(def.figmaNames || [])].map(String);
    if (names.some((n) => n && mcpText.toLowerCase().includes(n.toLowerCase()))) {
      catalog[name] = entry(name, def);
    }
  }

  const headerPath = (catalog.Header && catalog.Header.path) || '/patterns/gnb.html';
  const footerPath = (catalog.Footer && catalog.Footer.path) || '/patterns/footer.html';
  const pageName = prepared.pageName || runConfig.pageSlug || 'Figma Design';
  const sourceFileKey = String(runConfig.fileKey || prepared.sourceFileKey || '');
  const sourceNodeId = String(runConfig.nodeId || prepared.sourceNodeId || '');

  const prompt = `당신은 Yuma 포털 시니어 퍼블리셔입니다.
Figma MCP 시안을 **비주얼이 맞는 HTML**로 만드세요. 텍스트만 풀폭으로 나열하면 실패입니다.

# 목표 비주얼 (필수)
- 배경 #f4f5f6
- 본문은 가운데 흰 카드(둥근 모서리 + 그림자): layout-detail__surface
- 카드 안에 CaseHeader → ContactBar(노란 바) → 첨부 → 질문 → 상담답변(회색 박스) → 수정하기 버튼
- GNB/Footer만 풀폭. 본문 100% 풀블리드 금지

# 필수 뼈대 (이 class 트리 유지)
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
  <div class="layout-page">
    <div data-include-path="${headerPath}"></div>
    <main class="layout-page__main">
      <div class="layout-page__container">
        <section class="layout-detail">
          <header class="layout-detail__header">
            <nav class="ui-breadcrumb" aria-label="현재 위치"><span>목록</span></nav>
          </header>
          <div class="layout-detail__surface">
            <div class="layout-detail__content">
              <!-- 아래는 include 또는 portal-* 마크업. 값은 MCP만 -->
              <div data-include-path="/components/case-header.html" data-prop-badge1="..." data-prop-badge2="..." data-prop-status="보완요청" data-prop-title="..." data-prop-date="..."></div>
              <div data-include-path="/components/contact-bar.html" data-prop-category="..." data-prop-name="..." data-prop-phone="..."></div>
              <div data-include-path="/components/attachment-list.html" ...></div>
              <div data-include-path="/components/question-content.html" ...></div>
              <div data-include-path="/components/answer-panel.html" ...></div>
            </div>
            <div class="layout-detail__actions">
              <div data-include-path="/components/button.html" data-prop-label="수정하기"></div>
            </div>
          </div>
        </section>
      </div>
    </main>
    <div data-include-path="${footerPath}"></div>
  </div>
</body>
</html>

# 규칙
- layout-detail__surface 없으면 실패 (이게 가운데 카드)
- layout-page__container 없으면 실패 (폭 제한)
- page-layout / detail-view / question-area 로 바꾸지 말 것 (이 시안은 portal/layout-detail)
- {ts1}{/ts1} \\[ \\] 제거. 예: [보완요청] 은 status/title로 분리
- MCP에 있는 문구·배지·파일·비용·태그·버튼만 사용
- include path는 아래 component-map path만
- HTML만 출력

# component-map
${JSON.stringify(catalog, null, 2)}

# 실행 정보
pageName=${pageName}
fileKey=${sourceFileKey}
nodeId=${sourceNodeId}

# Figma MCP 원문
${mcpText}
`;

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
