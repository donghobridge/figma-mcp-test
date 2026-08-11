/**
 * Figma MCP 텍스트 + component-map → AI HTML 프롬프트.
 *
 * 목표 스타일: yuma-component-img_text/pages/*
 * - svg-symbols / gnb / footer 만 include
 * - 본문은 page-layout + 디자인 시스템 마크업 (전부 include 금지)
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

  function toCatalogEntry(name, def) {
    return {
      path: def.path || '',
      figmaNames: def.figmaNames || [],
      props: def.props || [],
      textProps: def.textProps || [],
      role: def.role || def.slot || '',
      description: def.description || '',
    };
  }

  // include 후보: gnb/footer + MCP에 이름이 명확히 보이는 것만 (본문 강제용 아님)
  const mcpLower = mcpText.toLowerCase();
  const catalog = {};
  for (const [name, def] of Object.entries(componentMap)) {
    if (!def || typeof def !== 'object' || def.type === 'layout') continue;
    const role = String(def.role || def.slot || '');
    const names = [name, ...(def.figmaNames || []), ...(def.aliases || [])].map(String);
    const hitShell = /header|footer|gnb/i.test(role) || /^(Header|Footer|GNB)$/i.test(name);
    const hitText = names.some((n) => n && mcpLower.includes(String(n).toLowerCase()));
    if (hitShell || hitText) catalog[name] = toCatalogEntry(name, def);
  }

  const pageName = prepared.pageName || runConfig.pageSlug || 'Figma Design';
  const headerPath = (catalog.Header && catalog.Header.path)
    || (Object.values(catalog).find((c) => /header|gnb/i.test(c.role)) || {}).path
    || '/patterns/gnb.html';
  const footerPath = (catalog.Footer && catalog.Footer.path)
    || (Object.values(catalog).find((c) => /footer/i.test(c.role)) || {}).path
    || '/patterns/footer.html';

  const sourceFileKey = String(runConfig.fileKey || prepared.sourceFileKey || '');
  const sourceNodeId = String(runConfig.nodeId || prepared.sourceNodeId || '');

  const prompt = `당신은 Yuma(노란우산) 포털 퍼블리셔입니다.
Figma MCP 원문의 화면을 HTML로 만드세요.
참고 페이지 스타일: yuma-component-img_text/pages (상담사례 상세/목록, 사업안내 등).

# 핵심 규칙 (중요)
- 페이지 전체를 data-include-path로 쪼개지 말 것
- include는 공통 셸만: svg-symbols, gnb, footer
- 본문은 실제 HTML 마크업으로 작성 (page-layout, breadcrumb-group, title-group, detail-view, badge, board-container 등)
- MCP 원문에 있는 텍스트/구조만 사용. 없는 문구 창작 금지
- TODO / lorem / 샘플 / (MCP제목) 금지
- head에 import.css, import.js, common.js 필수
- HTML만 출력 (설명/마크다운 금지)

# include 허용 범위
- 필수: /svg-symbols.html, ${headerPath}, ${footerPath}
- 선택: component-map에 있고, 참고 페이지처럼 공통 조각으로 빼는 게 자연스러울 때만
- case-header / question-content / answer-panel / key-value-card 등으로 본문 전체를 include 조립하지 말 것

# 문서 구조 (이 뼈대 유지)
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
  <div class="page-layout">
    <div data-include-path="${headerPath}"></div>

    <!-- 본문: 시안에 맞게 마크업. include로 대체하지 말 것 -->
    <div class="breadcrumb-group">...</div>
    <div class="title-group title--display">
      <h2 class="title-group__title">MCP제목</h2>
    </div>
    <div class="page-layout__page-inner page-layout--content">
      <div class="page-inner__inner">
        <!-- MCP 내용: badge, title-group, detail-view, question-area, answer-area, table 등 -->
      </div>
    </div>

    <div data-include-path="${footerPath}"></div>
  </div>
</body>
</html>

# 본문 작성 가이드
- 상담/게시 상세면: detail-view-container, badge-wrap, title-group, question-area(Q), answer-area(A), tag-list, post-nav 패턴 사용
- 목록이면: breadcrumb-group + title-group + board-container / custom-table 또는 카드 리스트
- 아이콘은 <svg class="icon"><use href="#icon-..."></use></svg>
- 줄바꿈은 <br> 사용 가능
- class 이름은 기존 디자인 시스템 관례를 따름 (page-layout, title-group__title, btn, badge 등)

# 이번 실행
pageName=${pageName}
fileKey=${sourceFileKey}
nodeId=${sourceNodeId}

# component-map (참고용. 본문 강제 include 목록 아님)
${JSON.stringify(catalog, null, 2)}

# Figma MCP 원문 (값·구조의 유일한 출처)
${mcpText}

위 규칙의 HTML만 출력하세요.`;

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
