const pageSpec = $('Figma 원문 props 적용').first().json;
const templateItems = $input.all();
const templates = {};

const signatures = [
  ['PortalHeader', 'class="portal-header"'], ['PortalFooter', 'class="portal-footer"'],
  ['CaseHeader', 'portal-case-header'], ['ContactBar', 'portal-contact-bar'],
  ['AttachmentList', 'portal-attachments'], ['QuestionContent', 'portal-question'],
  ['AnswerPanel', 'portal-answer'], ['TagList', 'class="portal-tag-list '],
  ['PageLayout', 'class="layout-page '], ['DetailLayout', 'class="layout-detail '],
  ['Header', 'class="gnb"'], ['Footer', 'class="footer"'],
  ['PageHero', 'ui-page-hero'], ['SectionHeading', 'ui-section-heading'],
  ['InfoCard', 'ui-info-card'], ['Notice', 'ui-notice'], ['ImageText', 'ui-image-text'],
  ['EventParticipationForm', 'action-input-field-wrapper'],
  ['FormCard', 'ui-form-card '], ['FormEmailField', 'ui-form-field__select'],
  ['FormDateField', 'ui-form-field__row--date'], ['FormAddressField', 'ui-form-field__stack'],
  ['FormChoiceGroup', 'ui-choice-group'], ['FormFileUpload', 'ui-file-upload'],
  ['FormCheckbox', 'ui-checkbox '],
  ['Breadcrumb', 'ui-breadcrumb '], ['Tabs', 'ui-tabs '],
  ['KeyValueCard', 'ui-kv-card '], ['SummaryBar', 'ui-summary-bar '],
  ['AmountSummary', 'ui-amount-summary '], ['LoanCard', 'ui-loan-card '],
  ['DataTable', 'ui-data-table '], ['Pagination', 'ui-pagination '],
  ['GuideAccordion', 'ui-guide '], ['ApplicationDateCard', 'ui-application-date '],
  ['StatusBadge', 'ui-status-badge '], ['ContentHeading', 'ui-content-heading '],
  ['ActionButtonGroup', 'ui-action-group '], ['EmptyState', 'ui-empty-state '],
  ['GenericSection', 'ui-generic-section '], ['GenericList', 'ui-generic-list '],
  ['FormTerms', 'ui-terms '], ['FormButtonGroup', 'ui-form-actions '],
  ['FormTextField', 'ui-form-field '], ['Button', 'ui-button'],
];

for (const item of templateItems) {
  const html = item.json.data || '';
  const match = signatures.find(([, signature]) => html.includes(signature));
  if (match) templates[match[0]] = html;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;').replace(/\n/g, '<br>');
}

function renderComponent(template, values) {
  const data = values || {};
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_, key) => {
    if (key === 'variantClass') return data.variantClass || '';
    if (key.endsWith('Html')) return data[key] || '';
    if (key.toLowerCase().includes('href') && !data[key]) return '#';
    return escapeHtml(data[key] || '');
  });
}

function renderLayout(template, slots) {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_, key) =>
    key === 'variantClass' ? slots.variantClass || '' : slots[key] || '');
}

let headerHtml = '';
let footerHtml = '';
const headingHtml = [];
const contentHtml = [];
const actionHtml = [];

for (const item of pageSpec.components || []) {
  const template = templates[item.component];
  if (!template) continue;
  const rendered = renderComponent(template, item.content || {});
  const html = `<!-- ${item.component}: ${item.figmaNode || ''} -->\n${rendered}`;

  if (item.component === 'PortalHeader' || item.component === 'Header') headerHtml = html;
  else if (item.component === 'PortalFooter' || item.component === 'Footer') footerHtml = html;
  else if (item.component === 'SectionHeading' || item.component === 'PageHero') headingHtml.push(html);
  else if (item.component === 'Button' || item.component === 'FormButtonGroup' || item.component === 'ActionButtonGroup') actionHtml.push(html);
  else contentHtml.push(html);
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

const detailTemplate = templates.DetailLayout || '<section>{heading}<div>{content}</div><div>{actions}</div></section>';
const useFormLayout = shouldUseFormLayout(pageSpec);
const detailHtml = renderLayout(detailTemplate, {
  variantClass: useFormLayout ? 'layout-detail--form' : '',
  heading: headingHtml.join('\n\n'), content: contentHtml.join('\n\n'), actions: actionHtml.join('\n\n'),
});
const pageTemplate = templates.PageLayout || '<div>{header}<main>{content}</main>{footer}</div>';
const assembledPage = renderLayout(pageTemplate, {
  variantClass: useFormLayout ? 'layout-page--form' : '',
  header: headerHtml, content: detailHtml, footer: footerHtml,
});
const safeTitle = escapeHtml(pageSpec.pageName);
const finalHtml = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeTitle}</title><link rel="stylesheet" href="/import.css"></head><body>
<div data-include-path="/svg-symbols.html"></div>
${assembledPage}<script src="/import.js"></script><script src="/common.js"></script></body></html>`;

return [{ json: {
  pageName: pageSpec.pageName,
  componentCount: (pageSpec.components || []).length,
  templatesFound: Object.keys(templates),
  html: finalHtml,
} }];
