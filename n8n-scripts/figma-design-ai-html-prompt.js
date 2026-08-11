/**
 * Figma MCP 텍스트 → AI HTML 프롬프트.
 * 참고: yuma-component-img_text/pages/경영자문/*
 * include = svg/gnb/footer 만. 본문은 detail-view 마크업.
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

  // 본문 include 유혹 제거: 셸(헤더/푸터)만 카탈로그
  const catalog = {};
  for (const [name, def] of Object.entries(componentMap)) {
    if (!def || typeof def !== 'object') continue;
    if (/^(Header|Footer|GNB)$/i.test(name) || /header|footer|gnb/i.test(String(def.role || def.slot || ''))) {
      catalog[name] = {
        path: def.path || '',
        role: def.role || def.slot || '',
      };
    }
  }

  const pageName = prepared.pageName || runConfig.pageSlug || 'Figma Design';
  const headerPath = (catalog.Header && catalog.Header.path) || '/patterns/gnb.html';
  const footerPath = (catalog.Footer && catalog.Footer.path) || '/patterns/footer.html';
  const sourceFileKey = String(runConfig.fileKey || prepared.sourceFileKey || '');
  const sourceNodeId = String(runConfig.nodeId || prepared.sourceNodeId || '');

  const prompt = `당신은 Yuma(노란우산) 포털 퍼블리셔입니다.
Figma MCP 시안을 yuma-component-img_text/pages 스타일 HTML로 만드세요.

# 절대 금지
- /components/*.html data-include-path 로 본문 조립 금지
  (case-header, question-content, answer-panel, contact-bar, attachment-list, tag-list, breadcrumb, button 등 전부 금지)
- class="layout-page" 사용 금지 → class="page-layout" 사용
- MCP에 없는 문장 창작 금지
- {ts1} {/ts1} \\[ \\] 같은 Figma 토큰/이스케이프를 그대로 출력 금지 (내용은 남기고 토큰만 제거)
- TODO, lorem, 샘플 금지
- 설명문/마크다운 금지. HTML만

# include 허용 (이것만)
- /svg-symbols.html
- ${headerPath}
- ${footerPath}

# 상담/게시 상세 뼈대 (이 구조를 따를 것 — 값은 MCP에서)
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

    <div class="title-group title--page">
      <a href="" class="title-group__title">
        <svg class="icon icon--32" aria-hidden="true"><use href="#icon-chevron-left"></use></svg>
        <span>목록</span>
      </a>
    </div>

    <div class="page-layout__page-inner page-layout--content">
      <div class="detail-view-container">
        <div class="page-inner__inner">
          <div class="detail-view__content">
            <div class="detail-view--content-header">
              <div class="detail-view--content-header-text">
                <div class="detail-view--content-header-title">
                  <div>
                    <div class="title-group title--content">
                      <div class="board-list__type">
                        <div class="badge-wrap">
                          <div class="badge badge--blue">MCP배지</div>
                          <div class="badge badge--gray">MCP배지</div>
                        </div>
                      </div>
                      <h2 class="title-group__title">MCP제목</h2>
                    </div>
                    <div class="title-group title--info content-card__meta">
                      <div class="title-group__text">작성일 : MCP날짜</div>
                      <div class="title-group__text">작성자 : MCP작성자</div>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 첨부파일이 있으면 -->
              <div class="detail-view--content-file-list">
                <div class="detail-view--content-file-list-item">
                  <span class="detail-view--content-file-list-item-name">
                    <svg class="icon icon--20" aria-hidden="true"><use href="#icon-attach"></use></svg>
                    MCP파일명
                  </span>
                  <div class="action-list">
                    <button class="btn btn--text" type="button">
                      <svg class="icon icon--12" aria-hidden="true"><use href="#icon-download"></use></svg>
                      <div class="btn__label">다운로드</div>
                    </button>
                    <button class="btn btn--text" type="button">
                      <svg class="icon icon--12" aria-hidden="true"><use href="#icon-document"></use></svg>
                      <div class="btn__label">바로보기</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="detail-view--content-body">
              <div class="question-area">
                <b><em>Q</em></b>
                <p class="detail-text">MCP질문본문</p>
              </div>
              <div class="answer-area">
                <b>A</b>
                <div class="answer-area__detail">
                  <!-- 자료보완요청 등 알림이 있으면 -->
                  <div class="notice-box"><!-- MCP알림 --></div>
                  <p class="detail-text">MCP답변본문<br></p>
                  <div class="tag-list">
                    <button class="tag tag--md">#MCP태그</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <nav class="post-nav" aria-label="게시글 네비게이션">
            <a href="#" class="post-nav__item post-nav__item--prev">
              <svg class="icon icon--20" aria-hidden="true"><use href="#icon-chevron-left"></use></svg>
              <span class="post-nav__label">이전 글</span>
              <span class="post-nav__title">MCP이전글</span>
            </a>
            <a href="#" class="post-nav__item post-nav__item--next">
              <span class="post-nav__title">MCP다음글</span>
              <span class="post-nav__label">다음글</span>
              <svg class="icon icon--20" aria-hidden="true"><use href="#icon-chevron-right"></use></svg>
            </a>
          </nav>
        </div>
      </div>
    </div>

    <div data-include-path="${footerPath}"></div>
  </div>
</body>
</html>

# 목록 화면이면
- breadcrumb-group + title-group title--display + board-container / custom-table 마크업
- 역시 /components include 금지

# 텍스트 정리
- {ts1}**강조**{/ts1} → <strong>강조</strong> 또는 일반 텍스트
- \\( \\) \\[ \\] → ( ) [ ]
- 연락처/카테고리 바는 detail-view 헤더 메타 또는 본문 상단 마크업으로 (contact-bar include 금지)

# 이번 실행
pageName=${pageName}
fileKey=${sourceFileKey}
nodeId=${sourceNodeId}

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
        warnings: prepared.warnings || [],
      },
      catalogComponentCount: Object.keys(catalog).length,
      runConfig,
      pageSlug: runConfig.pageSlug || 'design-page',
      mcpText,
    },
  }];
};
