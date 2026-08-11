const pageSpec = $input.first().json;
const componentMap = $('Extract component map').first().json || {};

function escapeAttr(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '&#10;');
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function dataKey(prop) {
  return prop.replace(/[A-Z]/g, (char) => '-' + char.toLowerCase());
}

function specialHtml(item) {
  if (item.component === 'FormChoiceGroup') {
    return (item.options || []).map((label, index) =>
      `<label class="ui-choice-group__option"><input type="radio" name="choice-${item.order}" ${index === 0 ? 'checked' : ''}><span>${escapeHtml(label)}</span></label>`
    ).join('');
  }
  if (item.component === 'FormTerms') {
    return (item.items || []).map((label) =>
      `<label class="ui-terms__item"><input type="checkbox"><span>${escapeHtml(label)}</span></label>`
    ).join('');
  }
  if (item.component === 'ActionButtonGroup') {
    return (item.actions || []).map((action) =>
      `<a class="ui-button ui-button--primary" href="${escapeAttr(action.href || '#')}">${escapeHtml(action.label)}</a>`
    ).join('');
  }
  if (item.component === 'GenericList') {
    return (item.items || []).map((label) => `<li>${escapeHtml(label)}</li>`).join('');
  }
  return '';
}

function renderInclude(item) {
  const definition = componentMap[item.component] || {};
  const fixedPath = {
    Header: '/patterns/gnb.html', Footer: '/patterns/footer.html',
    PortalHeader: '/patterns/gnb.html', PortalFooter: '/patterns/footer.html',
  }[item.component];
  const includePath = fixedPath || definition.path;
  if (!includePath) return '';

  const content = { ...(item.content || {}) };
  const childrenHtml = (item.children || []).map(renderInclude).join('\n');
  if (item.component === 'FormCard') content.bodyHtml = childrenHtml;
  if (item.component === 'FormChoiceGroup') content.optionsHtml = specialHtml(item);
  if (item.component === 'FormTerms') content.itemsHtml = specialHtml(item);
  if (item.component === 'ActionButtonGroup') content.buttonsHtml = specialHtml(item);
  if (item.component === 'GenericList') content.itemsHtml = specialHtml(item);

  const attrs = [`data-include-path="${escapeAttr(includePath)}"`];
  // 비어 있는 선택 prop도 빈 data-prop으로 전달해야 템플릿의 {placeholder}가 화면에 남지 않는다.
  for (const key of definition.props || []) {
    const value = content[key] || (key.toLowerCase().includes('href') ? '#' : '');
    attrs.push(`data-prop-${dataKey(key)}="${escapeAttr(value)}"`);
  }
  if (content.variantClass) {
    attrs.push(`data-class-variant="${escapeAttr(content.variantClass)}"`);
  }
  return `<div ${attrs.join(' ')}></div>`;
}

const FORM_LAYOUT_COMPONENTS = new Set([
  'EventParticipationForm',
  'FormCard',
  'FormTextField',
  'FormEmailField',
  'FormDateField',
  'FormAddressField',
  'FormChoiceGroup',
  'FormCheckbox',
  'FormFileUpload',
  'FormTerms',
  'FormButtonGroup',
]);

function walkComponents(items, visit) {
  for (const item of items || []) {
    visit(item);
    if (item.children && item.children.length) walkComponents(item.children, visit);
  }
}

function shouldUseFormLayout(spec) {
  const mode = String(spec.layoutMode || spec.pageType || '').toLowerCase();
  if (mode === 'form') return true;
  if (mode === 'content' || mode === 'detail' || mode === 'default') return false;
  let found = false;
  walkComponents(spec.components, (item) => {
    if (FORM_LAYOUT_COMPONENTS.has(item.component)) found = true;
  });
  return found;
}

let header = '';
let footer = '';
const heading = [];
const content = [];
const actions = [];

for (const item of pageSpec.components || []) {
  const definition = componentMap[item.component] || {};
  const html = renderInclude(item);
  if (!html) continue;
  if (definition.role === 'header' || definition.slot === 'header') header = html;
  else if (definition.role === 'footer' || definition.slot === 'footer') footer = html;
  else if (definition.slot === 'heading') heading.push(html);
  else if (definition.slot === 'actions') actions.push(html);
  else content.push(html);
}

const useFormLayout = shouldUseFormLayout(pageSpec);
const pageVariant = useFormLayout ? 'layout-page--form' : '';
const detailVariant = useFormLayout ? 'layout-detail--form' : '';
const title = escapeHtml(pageSpec.pageName || '와이어프레임');
const explanation = pageSpec.explanation || {};
const explanationList = (items) => (Array.isArray(items) ? items : [])
  .map((item) => `<li>${escapeHtml(item)}</li>`)
  .join('');
const explanationHtml = `<aside class="wireframe-notes" aria-label="와이어프레임 설계 설명">
  <div class="wireframe-notes__inner">
    <p class="wireframe-notes__eyebrow">WIREFRAME NOTES</p>
    <h2>화면 설계 설명</h2>
    <section><h3>화면 목적</h3><p>${escapeHtml(explanation.purpose || '')}</p></section>
    <section><h3>구성 영역</h3><ul>${explanationList(explanation.sections)}</ul></section>
    <section><h3>주요 동작</h3><ul>${explanationList(explanation.interactions)}</ul></section>
  </div>
</aside>`;
const finalHtml = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title><link rel="stylesheet" href="/import.css"><style>
.wireframe-review{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,360px);gap:32px;align-items:start;max-width:1680px;margin:0 auto;padding:0 32px}
.wireframe-review>.layout-page__main{min-width:0}.wireframe-review .layout-page__container{max-width:none;padding-left:0;padding-right:0}
.wireframe-notes{position:sticky;top:32px;margin-top:var(--layout-page-main-padding-top,48px)}
.wireframe-notes__inner{border:1px solid #d9dde3;border-radius:16px;background:#fff;padding:24px;box-shadow:0 10px 30px rgba(22,28,36,.08)}
.wireframe-notes__eyebrow{margin:0 0 8px;color:#64748b;font-size:12px;font-weight:700;letter-spacing:.08em}
.wireframe-notes h2{margin:0 0 24px;font-size:22px}.wireframe-notes section+section{margin-top:24px;padding-top:20px;border-top:1px solid #e5e7eb}
.wireframe-notes h3{margin:0 0 10px;font-size:15px}.wireframe-notes p,.wireframe-notes li{color:#475569;font-size:14px;line-height:1.65}
.wireframe-notes p{margin:0}.wireframe-notes ul{margin:0;padding-left:20px}.wireframe-notes li+li{margin-top:6px}
@media(max-width:1100px){.wireframe-review{grid-template-columns:1fr}.wireframe-notes{position:static;margin:0 0 40px}.wireframe-review{padding:0 20px}}
</style><script defer src="/import.js"></script><script defer src="/common.js"></script></head>
<body><div data-include-path="/svg-symbols.html"></div><div class="layout-page ${pageVariant}">
${header}<div class="wireframe-review"><main class="layout-page__main" id="main-content"><div class="layout-page__container"><section class="layout-detail ${detailVariant}">
<header class="layout-detail__header">${heading.join('\n')}</header><div class="layout-detail__surface"><div class="layout-detail__content">${content.join('\n')}</div><div class="layout-detail__actions">${actions.join('\n')}</div></div>
</section></div></main>${explanationHtml}</div>${footer}</div></body></html>`;

return [{ json: {
  pageName: pageSpec.pageName,
  componentCount: (pageSpec.components || []).length,
  generationMode: pageSpec.generationMode,
  layoutMode: useFormLayout ? 'form' : 'content',
  warnings: pageSpec.warnings || [],
  html: finalHtml,
} }];
