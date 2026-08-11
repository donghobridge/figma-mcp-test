/**
 * pageSpec → include-only HTML 조립
 * - 공개 상세: page-layout + detail-view-container (img_text)
 * - 폼: page-layout + action-box 계열 섹션
 * - props → data-prop-kebab-case, 빈 값 미출력
 */
module.exports = function ($input, helpers) {
  const input = $input.first().json || {};
  let pageSpec = input.pageSpec;
  if (!pageSpec || !Array.isArray(pageSpec.sections)) {
    pageSpec = (helpers && helpers.pageSpec && helpers.pageSpec.pageSpec)
      || (helpers && helpers.pageSpec)
      || null;
  }
  if ((!pageSpec || !Array.isArray(pageSpec.sections)) && helpers && typeof helpers.getJson === 'function') {
    const built = helpers.getJson('page-spec 빌드') || helpers.getJson('AI page-spec 파싱') || {};
    pageSpec = built.pageSpec || built;
  }
  if (!pageSpec || !Array.isArray(pageSpec.sections) || !pageSpec.sections.length) {
    throw new Error('pageSpec.sections가 없습니다. page-spec 빌드 결과를 확인하세요.');
  }

  const extractedMap = (helpers && helpers.extractedMap) || {};
  const componentMap = extractedMap.data && typeof extractedMap.data === 'object'
    ? extractedMap.data
    : extractedMap;

  const runConfig = (helpers && helpers.runConfig) || input.runConfig || {};
  const pageSlug = String(runConfig.pageSlug || input.pageSlug || 'design-page')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'design-page';
  const pageName = String(pageSpec.pageName || pageSlug).trim() || pageSlug;

  function escapeAttr(value) {
    return String(value == null ? '' : value)
      .replace(/\{ts\d+\}/gi, '')
      .replace(/\{\/ts\d+\}/gi, '')
      .replace(/\\+([*_()[\]])/g, '$1')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '&#10;');
  }

  function toKebab(prop) {
    return String(prop)
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/_/g, '-')
      .toLowerCase();
  }

  function renderInclude(section) {
    const name = section.component;
    const def = (componentMap && componentMap[name]) || {};
    const includePath = section.path || def.path || '';
    if (!includePath) {
      return `<!-- missing path: ${escapeAttr(name)} -->`;
    }
    const props = section.props && typeof section.props === 'object' ? section.props : {};
    const attrs = [`data-include-path="${escapeAttr(includePath)}"`];
    const propKeys = Array.isArray(def.props) && def.props.length
      ? def.props.slice()
      : Object.keys(props);

    for (const key of propKeys) {
      let value = props[key];
      if (value == null || value === '') {
        if (/^(downloadHref|previewHref)(\d+)$/i.test(key)) {
          const n = (key.match(/(\d+)$/) || [])[1];
          if (!props[`file${n}`] && !props[`type${n}`]) continue;
          value = '#';
        } else if (/href/i.test(key) && (props[key.replace(/Href.*/i, '')] || /button|primary|secondary|label/i.test(key))) {
          value = key === 'href' && props.label ? '#' : ( /href/i.test(key) ? '#' : '');
          if (!value) continue;
        } else {
          continue;
        }
      }
      attrs.push(`data-prop-${toKebab(key)}="${escapeAttr(value)}"`);
    }

    if (props.variantClass) {
      attrs.push(`data-class-variant="${escapeAttr(props.variantClass)}"`);
    }

    const comment = section.figmaName
      ? `<!-- ${escapeAttr(name)}: ${escapeAttr(section.figmaName)} -->`
      : `<!-- ${escapeAttr(name)} -->`;
    return `${comment}\n<div ${attrs.join(' ')}></div>`;
  }

  const backComps = /^(BackToList)$/i;
  const headerComps = /^(SectionHeading|Breadcrumb|BreadcrumbGroup|PageTitle|PageTitleDisplay|DetailContentHeader|CaseHeader)$/i;
  const actionComps = /^(FormButtonGroup|ActionButtonGroup|ButtonGroup|PrimaryButton|Button)$/i;
  const profileComps = /^(AdvisorProfile)$/i;

  const backParts = [];
  const headerParts = [];
  const contentParts = [];
  const profileParts = [];
  const actionParts = [];

  for (const section of pageSpec.sections) {
    const html = renderInclude(section);
    const slot = String(section.slot || '').toLowerCase();
    if (backComps.test(section.component) || slot === 'back') {
      backParts.push(html);
    } else if (slot === 'actions' || actionComps.test(section.component)) {
      actionParts.push(html);
    } else if (profileComps.test(section.component) || slot === 'profile') {
      profileParts.push(html);
    } else if (slot === 'header' || headerComps.test(section.component)) {
      headerParts.push(html);
    } else {
      contentParts.push(html);
    }
  }

  // AdvisorProfile는 AnswerArea 바로 뒤에 붙이도록 content 끝에 합침
  if (profileParts.length) {
    contentParts.push(...profileParts);
  }

  const names = pageSpec.sections.map((s) => s.component);
  const isForm = names.some((n) => /Form|GuideAccordion|SummaryBar|ApplicationDate|KeyValue|ActionBox|AmountBox/i.test(n))
    && !names.some((n) => /CaseHeader|DetailContentHeader|QuestionArea|QuestionContent|AnswerArea|AnswerPanel/i.test(n));
  const isPublicDetail = names.some((n) =>
    /CaseHeader|DetailContentHeader|QuestionArea|QuestionContent|AnswerArea|AnswerPanel|BackToList|ContactBar|AttachmentList/i.test(n)
  );

  const headerPath = pageSpec.headerPath || '/patterns/gnb.html';
  const footerPath = pageSpec.footerPath || '/patterns/footer.html';

  let mainInner = '';
  if (isForm) {
    mainInner = `
    <div class="page-layout__page-inner page-layout--content">
      <div class="page-inner__inner">
${headerParts.join('\n\n')}
${contentParts.join('\n\n')}
        <div class="action-button-list">
${actionParts.join('\n\n')}
        </div>
      </div>
    </div>`;
  } else if (isPublicDetail) {
    mainInner = `
${backParts.join('\n\n')}
    <div class="page-layout__page-inner page-layout--content">
      <div class="detail-view-container">
        <div class="page-inner__inner">
          <div class="detail-view__content">
${headerParts.join('\n\n')}
            <div class="detail-view--content-body">
${contentParts.join('\n\n')}
            </div>
          </div>
          <div class="action-button-list" style="margin-top:24px;justify-content:center;">
${actionParts.join('\n\n')}
          </div>
        </div>
      </div>
    </div>`;
  } else {
    mainInner = `
${backParts.join('\n\n')}
${headerParts.join('\n\n')}
    <div class="page-layout__page-inner page-layout--content">
      <div class="page-inner__inner">
${contentParts.join('\n\n')}
        <div class="action-button-list">
${actionParts.join('\n\n')}
        </div>
      </div>
    </div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeAttr(pageName)}</title>
  <link rel="stylesheet" href="/import.css">
  <script defer src="/import.js"></script>
  <script defer src="/common.js"></script>
</head>
<body>
  <div data-include-path="/svg-symbols.html"></div>
  <div class="page-layout">
    <div data-include-path="${escapeAttr(headerPath)}"></div>
${mainInner}

    <div data-include-path="${escapeAttr(footerPath)}"></div>
  </div>
</body>
</html>
`;

  return [{
    json: {
      html,
      pageName,
      pageSlug,
      includeCount: pageSpec.sections.length,
      componentCount: pageSpec.sections.length,
      sectionNames: names,
      layoutMode: isForm ? 'form' : (isPublicDetail ? 'public-detail' : 'content'),
      generationMode: 'pagespec-assemble',
      sourceNodeId: runConfig.nodeId || '',
      warnings: [],
      pageSpec,
    },
  }];
};
