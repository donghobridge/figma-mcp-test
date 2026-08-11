/**
 * Figma MCP → AI HTML 프롬프트 (범용).
 * 고정: 문서 셸 + gnb/footer + 폭 컨테이너만.
 * 본문 블록 종류/순서는 MCP NODES 트리를 따른다 (화면별 레시피 금지).
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
      description: def.description || '',
    };
  }

  // MCP에 등장하거나 셸 역할인 컴포넌트만 카탈로그
  const catalog = {};
  const mcpLower = mcpText.toLowerCase();
  for (const [name, def] of Object.entries(componentMap)) {
    if (!def || typeof def !== 'object' || def.type === 'layout') continue;
    const role = String(def.role || def.slot || '');
    const names = [name, ...(def.figmaNames || []), ...(def.aliases || [])].map(String);
    const hitShell = /header|footer|gnb/i.test(role) || /^(Header|Footer|GNB)$/i.test(name);
    const hitText = names.some((n) => n && mcpLower.includes(String(n).toLowerCase()));
    if (hitShell || hitText) catalog[name] = entry(name, def);
  }
  if (Object.keys(catalog).length < 6) {
    for (const [name, def] of Object.entries(componentMap)) {
      if (!def || typeof def !== 'object' || def.type === 'layout') continue;
      if (!catalog[name]) catalog[name] = entry(name, def);
    }
  }

  // MCP NODES에서 본문 FRAME 이름 순서 추출 (섹션 순서 힌트)
  const sectionOrder = [];
  const nodesIdx = mcpText.search(/(?:^|\n)NODES:\s*\n/);
  const nodesPart = nodesIdx >= 0 ? mcpText.slice(nodesIdx) : mcpText;
  const frameRe = /^(\s*)\[FRAME\]\s+"([^"]+)"/gm;
  let fm;
  while ((fm = frameRe.exec(nodesPart)) !== null) {
    const indent = fm[1].length;
    const name = fm[2];
    if (indent > 8) continue; // 너무 깊은 노드 스킵
    if (/^(wrapper| Hol|item|box|grid|columns|fixed-con|content)$/i.test(name)) continue;
    if (/^Header$|^Footer$|^GNB$/i.test(name)) continue;
    if (!sectionOrder.includes(name)) sectionOrder.push(name);
    if (sectionOrder.length >= 30) break;
  }

  const headerPath = (catalog.Header && catalog.Header.path) || '/patterns/gnb.html';
  const footerPath = (catalog.Footer && catalog.Footer.path) || '/patterns/footer.html';
  const pageName = prepared.pageName || runConfig.pageSlug || 'Figma Design';
  const sourceFileKey = String(runConfig.fileKey || prepared.sourceFileKey || '');
  const sourceNodeId = String(runConfig.nodeId || prepared.sourceNodeId || '');

  const prompt = `당신은 Yuma 포털 퍼블리셔입니다.
Figma MCP 시안을 HTML로 만드세요. **화면마다 구성이 다릅니다. 특정 페이지 레시피를 가정하지 마세요.**

# 고정해도 되는 것 (공통 셸만)
- head: import.css / import.js / common.js
- include: /svg-symbols.html, ${headerPath}, ${footerPath}
- 폭 제한 래퍼: layout-page > layout-page__main > layout-page__container
- (카드형 상세면) layout-detail > layout-detail__surface 사용 가능
- GNB/Footer만 풀폭. 본문 100% 풀블리드 금지

# 고정하면 안 되는 것
- 본문 블록 종류/순서 (CaseHeader→ContactBar→… 같은 특정 화면 순서 금지)
- 대출상환/상담상세 등 특정 화면을 기본값으로 쓰지 말 것

# 본문 구성 방법
1. 아래 MCP 섹션 순서(FRAME 이름)를 위에서 아래로 따라가며 조립
2. 이름이 component-map 과 맞으면 data-include-path(map.path) + data-prop-* 사용
3. map에 없으면 기존 DS 마크업으로 작성 (임의 새 디자인 시스템 만들지 말 것)
4. 값은 MCP 텍스트만. {ts1}{/ts1} \\[ \\] 토큰 제거
5. HTML만 출력

# 공통 셸 예시 (본문은 MCP 순서대로 채움)
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
          <div class="layout-detail__surface">
            <div class="layout-detail__content">
              <!-- MCP 섹션 순서대로 include/마크업 -->
            </div>
          </div>
        </section>
      </div>
    </main>
    <div data-include-path="${footerPath}"></div>
  </div>
</body>
</html>

# 이번 실행 MCP 섹션 순서 (이 순서를 따를 것)
${sectionOrder.length ? sectionOrder.map((n, i) => `${i + 1}. ${n}`).join('\n') : '(NODES FRAME 파싱 실패 — MCP NODES 원문 순서 사용)'}

# 실행 정보
pageName=${pageName}
fileKey=${sourceFileKey}
nodeId=${sourceNodeId}

# component-map (path/props만 사용)
${JSON.stringify(catalog, null, 2)}

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
        sectionOrder,
        warnings: prepared.warnings || [],
      },
      catalogComponentCount: Object.keys(catalog).length,
      runConfig,
      pageSlug: runConfig.pageSlug || 'design-page',
      mcpText,
    },
  }];
};
