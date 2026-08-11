const pageSpec = $input.first().json;
const extractedMap = $('Extract component map').first().json || {};
const componentMap = extractedMap.data && typeof extractedMap.data === 'object'
  ? extractedMap.data
  : extractedMap;

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
      `<label class="ui-choice-group__option"><input type="radio" name="choice-${item.order || 0}" ${index === 0 ? 'checked' : ''}><span>${escapeHtml(label)}</span></label>`
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
  for (const key of definition.props || []) {
    const value = content[key] || (key.toLowerCase().includes('href') ? '#' : '');
    attrs.push(`data-prop-${dataKey(key)}="${escapeAttr(value)}"`);
  }
  if (content.variantClass) attrs.push(`data-class-variant="${escapeAttr(content.variantClass)}"`);
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
const title = escapeHtml(pageSpec.pageName || 'Figma Wireframe');
const finalHtml = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title><link rel="stylesheet" href="/import.css"><script defer src="/import.js"></script><script defer src="/common.js"></script></head>
<body><div data-include-path="/svg-symbols.html"></div><div class="layout-page ${pageVariant}">
${header}<main class="layout-page__main" id="main-content"><div class="layout-page__container"><section class="layout-detail ${detailVariant}">
<header class="layout-detail__header">${heading.join('\n')}</header><div class="layout-detail__surface"><div class="layout-detail__content">${content.join('\n')}</div><div class="layout-detail__actions">${actions.join('\n')}</div></div>
</section></div></main>${footer}</div></body></html>`;

return [{ json: {
  pageName: pageSpec.pageName,
  componentCount: (pageSpec.components || []).length,
  generationMode: pageSpec.generationMode,
  layoutMode: useFormLayout ? 'form' : 'content',
  warnings: pageSpec.warnings || [],
  html: finalHtml,
} }];
