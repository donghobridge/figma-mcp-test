/**
 * page-spec + component-map → AI HTML 조립 프롬프트 생성.
 * assembler.js 없이 LLM이 include HTML을 직접 작성한다.
 */
module.exports = function ($input, helpers) {
  const pageSpec = $input.first().json || {};
  const extractedMap = (helpers && helpers.extractedMap) || {};
  const rawMap = extractedMap.data && typeof extractedMap.data === 'object'
    ? extractedMap.data
    : extractedMap;

  const catalog = {};
  for (const [name, def] of Object.entries(rawMap || {})) {
    if (!def || typeof def !== 'object') continue;
    if (def.type === 'layout') continue;
    catalog[name] = {
      path: def.path || '',
      props: def.props || [],
      requiredProps: def.requiredProps || [],
      slot: def.slot || def.role || '',
      description: def.description || '',
    };
  }

  const components = (pageSpec.components || []).map((item, index) => ({
    order: index + 1,
    component: item.component,
    content: item.content || {},
    options: item.options || [],
    items: item.items || [],
    children: (item.children || []).map((child) => ({
      component: child.component,
      content: child.content || {},
      options: child.options || [],
      items: child.items || [],
    })),
  }));

  const useFormLayout = components.some((item) =>
    String(item.component || '').startsWith('Form')
    || item.component === 'EventParticipationForm'
    || (item.children || []).some((child) => String(child.component || '').startsWith('Form'))
  );

  const prompt = `당신은 Yuma 컴포넌트 라이브러리 HTML 조립기입니다.
assembler 코드 없이, 아래 page-spec과 component-map만 보고 완성 HTML을 작성하세요.

# 출력 규칙
1. 마크다운/설명 금지. HTML 문서만 출력.
2. <!DOCTYPE html> 부터 </html> 까지 한 페이지.
3. 컴포넌트는 반드시 data-include-path 방식:
   <div data-include-path="/components/....html" data-prop-xxx="값"></div>
4. prop 키는 camelCase → data-prop-kebab-case (예: noticeTitle → data-prop-notice-title)
5. Header는 /patterns/gnb.html, Footer는 /patterns/footer.html
6. page-spec에 없는 컴포넌트를 만들지 마세요.
7. content 값이 비어 있어도 태그는 유지하되 data-prop는 생략 가능. href는 없으면 "#"
8. 레이아웃 클래스:
   - 바깥: <div class="layout-page${useFormLayout ? ' layout-page--form' : ''}">
   - 안쪽: <section class="layout-detail${useFormLayout ? ' layout-detail--form' : ''}">
9. head에 반드시:
   <link rel="stylesheet" href="/import.css">
   <script defer src="/import.js"></script>
   <script defer src="/common.js"></script>
10. body 시작에 <div data-include-path="/svg-symbols.html"></div>
11. slot=heading 은 layout-detail__header
    slot=content 는 layout-detail__content
    slot=actions 는 layout-detail__actions
12. FormCard children은 FormCard include 대신 action-box 구조로 감싸도 되고,
    각 child를 개별 include로 평탄하게 나열해도 됩니다. props는 유지.

# component-map (허용 컴포넌트)
${JSON.stringify(catalog, null, 2)}

# page-spec
pageName: ${pageSpec.pageName || 'page'}
components:
${JSON.stringify(components, null, 2)}

위 규칙으로 완성 HTML만 출력하세요.`;

  return [{
    json: {
      ...pageSpec,
      aiHtmlPrompt: prompt,
      assemblyMode: 'ai',
      catalogComponentCount: Object.keys(catalog).length,
    },
  }];
};
