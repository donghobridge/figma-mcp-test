/**
 * Figma MCP 텍스트 → AI HTML 프롬프트.
 * 참고: yuma-component-img_text/pages/경영자문/*
 * include = svg/gnb/footer 만.
 * MCP 레이아웃(폭/프레임명)을 반영 — 텍스트만 덤프 금지.
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

  const catalog = {};
  for (const [name, def] of Object.entries(componentMap)) {
    if (!def || typeof def !== 'object') continue;
    if (/^(Header|Footer|GNB)$/i.test(name) || /header|footer|gnb/i.test(String(def.role || def.slot || ''))) {
      catalog[name] = { path: def.path || '', role: def.role || def.slot || '' };
    }
  }

  // MCP 레이아웃 힌트 추출 (텍스트만이 아니라 폭/프레임 구조 활용)
  const contentWidths = [];
  const widthRe = /"width"\s*:\s*(\d{2,4})|dimensions:\s*\{\s*width:\s*(\d{2,4})|width:\s*(\d{2,4})\s*(?:,|\})/g;
  let wm;
  while ((wm = widthRe.exec(mcpText)) !== null) {
    const w = Number(wm[1] || wm[2] || wm[3]);
    if (w >= 480 && w <= 900) contentWidths.push(w);
  }
  contentWidths.sort((a, b) => a - b);
  const mainContentWidth = contentWidths[Math.floor(contentWidths.length / 2)] || 660;
  const useRestr = mainContentWidth <= 720;

  const frameNames = [];
  const frameRe = /\[FRAME\]\s+"([^"]+)"/g;
  let fm;
  while ((fm = frameRe.exec(mcpText)) !== null) {
    const n = fm[1];
    if (!/^(wrapper|content| Hol|item|box|grid|columns)/i.test(n) && frameNames.length < 24) {
      frameNames.push(n);
    }
  }

  const pageName = prepared.pageName || runConfig.pageSlug || 'Figma Design';
  const headerPath = (catalog.Header && catalog.Header.path) || '/patterns/gnb.html';
  const footerPath = (catalog.Footer && catalog.Footer.path) || '/patterns/footer.html';
  const sourceFileKey = String(runConfig.fileKey || prepared.sourceFileKey || '');
  const sourceNodeId = String(runConfig.nodeId || prepared.sourceNodeId || '');

  const innerClass = useRestr
    ? 'page-layout__page-inner page-layout__page-inner--restr page-layout--content'
    : 'page-layout__page-inner page-layout--content';

  const prompt = `당신은 Yuma(노란우산) 포털 퍼블리셔입니다.
Figma MCP 시안의 **레이아웃 + 텍스트**를 yuma-component-img_text/pages 스타일 HTML로 재현하세요.
텍스트만 나열하고 폭을 100%로 늘리면 실패입니다.

# MCP에서 읽은 레이아웃 힌트 (반드시 반영)
- 본문 콘텐츠 폭 ≈ ${mainContentWidth}px → 화면 풀폭(100%) 금지
- 내부 래퍼 class: ${innerClass}
- ${useRestr ? '좁은 본문(약 66rem). page-layout__page-inner--restr 사용' : '일반 content 폭. 좌우 page padding으로 가운데 정렬'}
- 주요 FRAME 이름: ${frameNames.slice(0, 16).join(', ') || '(없음)'}

# 절대 금지
- /components/*.html 로 본문 조립 금지
- class="layout-page" / layout-page__main 금지
- 본문을 width:100% 풀블리드로 펼치기 금지 (GNB/Footer만 풀폭)
- MCP에 없는 문장 창작 금지
- {ts1}{/ts1} \\[ \\] 토큰 그대로 출력 금지
- HTML만 출력

# include 허용 (이것만)
- /svg-symbols.html
- ${headerPath}
- ${footerPath}

# 구조 (참고 페이지와 동일 — 폭 제약 class 유지)
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

    <!-- 목록 복귀 또는 breadcrumb: MCP에 맞게 -->
    <div class="title-group title--page">
      <a href="" class="title-group__title">
        <svg class="icon icon--32" aria-hidden="true"><use href="#icon-chevron-left"></use></svg>
        <span>목록</span>
      </a>
    </div>

    <div class="${innerClass}">
      <div class="detail-view-container">
        <div class="page-inner__inner">
          <!-- MCP FRAME 순서대로 마크업. include 금지 -->
          <div class="detail-view__content">
            <div class="detail-view--content-header">...</div>
            <div class="detail-view--content-body">
              <div class="question-area">...</div>
              <div class="answer-area">...</div>
            </div>
          </div>
          <nav class="post-nav">...</nav>
        </div>
      </div>
    </div>

    <div data-include-path="${footerPath}"></div>
  </div>
</body>
</html>

# 레이아웃 규칙
- GNB/Footer: 풀폭 OK
- 본문: ${innerClass} 안에만 배치 (이게 폭을 제한함)
- MCP card/FormCard 폭(${mainContentWidth}px대)을 존중. 화면 전체로 늘리지 말 것
- badge, title-group, detail-text, tag-list, btn 등 기존 DS class 사용
- 아이콘: <svg class="icon"><use href="#icon-..."></use></svg>

# 이번 실행
pageName=${pageName}
fileKey=${sourceFileKey}
nodeId=${sourceNodeId}
contentWidthHint=${mainContentWidth}

# Figma MCP 원문
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
        contentWidthHint: mainContentWidth,
        useRestr,
        warnings: prepared.warnings || [],
      },
      catalogComponentCount: Object.keys(catalog).length,
      runConfig,
      pageSlug: runConfig.pageSlug || 'design-page',
      mcpText,
    },
  }];
};
