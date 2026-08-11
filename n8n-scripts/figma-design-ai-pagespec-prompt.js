/**
 * Figma MCP prepare + component-map → AI page-spec 프롬프트.
 * 결정형 매칭 없음. LLM이 컴포넌트 선택·props·순서를 결정한다.
 */
module.exports = function ($input, helpers) {
  const inputJson = $input.first().json || {};
  const prepared = (inputJson.prepared && Array.isArray(inputJson.prepared.designNodes))
    ? inputJson.prepared
    : ((helpers && helpers.prepared) || {});
  const extractedMap = inputJson.extractedMap
    || (helpers && helpers.extractedMap)
    || {};
  const componentMap = extractedMap.data && typeof extractedMap.data === 'object'
    ? extractedMap.data
    : extractedMap;
  const runConfig = prepared.runConfig || (helpers && helpers.runConfig) || {};

  if (!prepared || !Array.isArray(prepared.designNodes)) {
    throw new Error('시안 구조(designNodes)가 없습니다. Figma MCP 정리 단계를 확인하세요.');
  }
  if (!componentMap || typeof componentMap !== 'object' || !Object.keys(componentMap).length) {
    throw new Error('component-map이 비어 있습니다.');
  }

  const catalog = {};
  for (const [name, def] of Object.entries(componentMap)) {
    if (!def || typeof def !== 'object' || def.type === 'layout') continue;
    catalog[name] = {
      path: def.path || '',
      figmaNames: def.figmaNames || [],
      props: def.props || [],
      textProps: def.textProps || [],
      requiredProps: def.requiredProps || [],
      slot: def.slot || def.role || '',
      role: def.role || '',
      acceptsChildren: Boolean(def.acceptsChildren),
      description: def.description || '',
      variants: def.variants || [],
    };
  }

  // MCP 노드를 압축: 이름·텍스트·주석만 (AI 컨텍스트용)
  const nodes = (prepared.designNodes || [])
    .filter((node) => {
      const name = String(node.name || '').trim();
      if (!name && !(node.ownTexts || []).length) return false;
      if (/^(User Actions|Logout|Dark Mode|Navigation|Search|icon_size)/i.test(name)) return false;
      return true;
    })
    .slice(0, 180)
    .map((node) => {
      const own = (node.ownTexts || []).map((t) => String(t).trim()).filter(Boolean).slice(0, 8);
      const child = (node.childTexts || []).map((t) => String(t).trim()).filter(Boolean).slice(0, 12);
      const row = {
        id: node.id || '',
        depth: Number(node.depth) || 0,
        type: node.type || '',
        name: node.name || '',
      };
      if (own.length) row.ownTexts = own;
      if (child.length && child.join('|') !== own.join('|')) row.childTexts = child;
      if (node.annotation && node.annotation.component) {
        row.annotation = {
          component: node.annotation.component,
          props: node.annotation.props || {},
        };
      }
      return row;
    });

  const prompt = `당신은 Yuma 포털 page-spec 조립기입니다.
Figma MCP로 추출한 시안 구조와 component-map만 보고 page-spec JSON을 만드세요.
결정형 규칙/하드코딩 매칭 없이, 시안 텍스트·레이어명을 보고 컴포넌트를 고르고 props를 채우세요.

# 절대 규칙
1. 마크다운/설명 금지. JSON 객체만 출력.
2. 사용할 컴포넌트는 component-map 키만. 임의 컴포넌트명 금지.
3. Header/Footer는 map에 있으면 각각 1회만 (content는 비워도 됨). 패턴 include는 조립기가 처리.
4. Footer 안의 atomic_input / 전국지점안내 등은 FormTextField로 만들지 마세요. Footer에 포함됩니다.
5. Table_A_PC 같은 반복 행은 KeyValueCard 하나에서 label1/value1 … labelN/valueN으로 합치세요 (최대 12).
6. SummaryBar는 label=항목명(텍스트), value=금액/수치. 절대 뒤바꾸지 마세요.
7. GuideAccordion은 title + contentHtml(본문, <br> 허용).
8. FormCard는 실제 입력 폼 컨테이너일 때만. 단순 정보 카드(신청내역 KV, Summary)를 FormCard로 감싸지 마세요.
9. props 키는 map의 props/textProps만 사용.
10. variantClass가 필요하면 map variants 중 하나 (예: ui-kv-card--sheet, ui-summary-bar--stack).

# 출력 JSON 스키마
{
  "pageName": "string",
  "components": [
    {
      "component": "ComponentName",
      "content": { "prop": "value" },
      "children": [],
      "options": [],
      "items": [],
      "actions": [],
      "figmaNode": "레이어명"
    }
  ],
  "warnings": []
}

# 페이지
pageName: ${prepared.pageName || 'Figma Design'}
annotationCount: ${prepared.annotationCount || 0}

# component-map
${JSON.stringify(catalog, null, 2)}

# Figma designNodes (MCP)
${JSON.stringify(nodes, null, 2)}

위 규칙으로 page-spec JSON만 출력하세요.`;

  return [{
    json: {
      prompt,
      preparedMeta: {
        pageName: prepared.pageName || 'Figma Design',
        nodeCount: (prepared.designNodes || []).length,
        annotationCount: prepared.annotationCount || 0,
        warnings: prepared.warnings || [],
      },
      catalogComponentCount: Object.keys(catalog).length,
      compactNodeCount: nodes.length,
      runConfig,
      outputHtmlPath: runConfig.outputHtmlPath || '/workspace/yuma-component-library/pages/design_page.html',
      outputReportPath: runConfig.outputReportPath || '/workspace/yuma-component-library/generated-figma-design-report.json',
    },
  }];
};
