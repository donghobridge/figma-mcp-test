/**
 * pageSpec → include-only HTML 조립
 * - 셸(layout-page / gnb / footer / layout-detail) 고정
 * - 섹션 순서는 pageSpec.sections (MCP 기반)
 * - props → data-prop-kebab-case
 * - fs 없이 include만 출력 (런타임 import.js가 채움)
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

  const runConfig = (helpers && helpers.runConfig)
    || input.runConfig
    || {};
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
        } else if (/href/i.test(key) && (props[key.replace(/Href.*/i, '')] || /button|primary|secondary/i.test(key))) {
          value = '#';
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

  const headerComps = /^(SectionHeading|Breadcrumb|PageTitle)$/i;
  const actionComps = /^(FormButtonGroup|ActionButtonGroup|ButtonGroup|PrimaryButton)$/i;

  const headerParts = [];
  const contentParts = [];
  const actionParts = [];

  for (const section of pageSpec.sections) {
    const html = renderInclude(section);
    const slot = String(section.slot || '').toLowerCase();
    if (slot === 'actions' || actionComps.test(section.component)) {
      actionParts.push(html);
    } else if (slot === 'header' || headerComps.test(section.component)) {
      headerParts.push(html);
    } else {
      contentParts.push(html);
    }
  }

  const names = pageSpec.sections.map((s) => s.component);
  const isForm = names.some((n) => /Form|GuideAccordion|SummaryBar|ApplicationDate/i.test(n));
  const detailClass = isForm ? 'layout-detail layout-detail--form' : 'layout-detail';
  const pageClass = isForm ? 'layout-page layout-page--form' : 'layout-page';

  const headerPath = pageSpec.headerPath || '/patterns/gnb.html';
  const footerPath = pageSpec.footerPath || '/patterns/footer.html';

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
<div class="${pageClass}">
<div data-include-path="${escapeAttr(headerPath)}"></div>

  <main class="layout-page__main" id="main-content">
    <div class="layout-page__container">
<section class="${detailClass}">
  <header class="layout-detail__header">
${headerParts.join('\n\n') || '<!-- no header sections -->'}
  </header>
  <div class="layout-detail__surface">
    <div class="layout-detail__content">
${contentParts.join('\n\n') || '<!-- no content sections -->'}
    </div>
    <div class="layout-detail__actions">
${actionParts.join('\n\n')}
    </div>
  </div>
</section>
    </div>
  </main>

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
      generationMode: 'pagespec-assemble',
      sourceNodeId: runConfig.nodeId || '',
      warnings: [],
      pageSpec,
    },
  }];
};
