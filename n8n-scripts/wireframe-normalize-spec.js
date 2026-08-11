const input = $input.first().json;
const componentMap = $('Extract component map').first().json || {};
const raw = String(input.text || input.output || '').trim();

function parseJson(value) {
  const cleaned = value
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error('와이어프레임 JSON 파싱 실패: ' + error.message);
  }
}

function cleanText(value) {
  const text = String(value == null ? '' : value).trim();
  if (/^\{[^{}]+\}$/.test(text) || /^\[[^\[\]]+\]$/.test(text)) return '';
  return text.replace(/\{(?:description|category|buttonLabel|imageAlt|fileName)\}/gi, '').trim();
}

const forbidden = new Set(['PageLayout', 'DetailLayout', 'EventParticipationForm']);
const warnings = [];
const errors = [];

function normalizeComponent(item, depth = 0) {
  if (!item || typeof item !== 'object') return null;
  const component = cleanText(item.component);
  const definition = componentMap[component];
  if (!definition || forbidden.has(component)) {
    warnings.push('사용할 수 없는 컴포넌트 제외: ' + (component || '(없음)'));
    return null;
  }

  const content = {};
  const sourceContent = item.content && typeof item.content === 'object' ? item.content : {};
  for (const prop of definition.props || []) {
    if (prop.endsWith('Html')) continue;
    content[prop] = cleanText(sourceContent[prop]);
  }

  for (const prop of definition.requiredProps || []) {
    if (prop.endsWith('Html')) continue;
    if (!content[prop]) errors.push(component + '.' + prop);
  }

  const output = {
    component,
    content,
    children: [],
  };

  if (Array.isArray(item.options)) {
    output.options = item.options.map(cleanText).filter(Boolean).slice(0, 20);
  }
  if (Array.isArray(item.items)) {
    output.items = item.items.map(cleanText).filter(Boolean).slice(0, 20);
  }
  if (Array.isArray(item.actions)) {
    output.actions = item.actions
      .map((action) => ({ label: cleanText(action?.label), href: cleanText(action?.href) || '#' }))
      .filter((action) => action.label)
      .slice(0, 8);
  }

  if (depth < 2 && Array.isArray(item.children)) {
    output.children = item.children
      .map((child) => normalizeComponent(child, depth + 1))
      .filter(Boolean);
  }

  return output;
}

const parsed = parseJson(raw);
let components = (Array.isArray(parsed.components) ? parsed.components : [])
  .map((item) => normalizeComponent(item))
  .filter(Boolean);

components = components.filter((item) => !['Header', 'Footer', 'PortalHeader', 'PortalFooter'].includes(item.component));
components.unshift({ component: 'Header', content: {}, children: [] });
components.push({ component: 'Footer', content: {}, children: [] });

if (!components.some((item) => item.component === 'SectionHeading')) {
  errors.push('SectionHeading.title');
}
if (errors.length) {
  throw new Error('필수 입력값 누락: ' + [...new Set(errors)].join(', '));
}

const sourceRequirements = String($('요구사항 입력').first().json.requirements || '');
const purposeMatch = sourceRequirements.match(/^목적\s*:\s*(.+)$/m);
const requestedPurpose = purposeMatch ? cleanText(purposeMatch[1]) : '';
const explanationSource = parsed.explanation && typeof parsed.explanation === 'object'
  ? parsed.explanation
  : {};

function cleanList(value) {
  return (Array.isArray(value) ? value : [])
    .map(cleanText)
    .filter(Boolean)
    .slice(0, 12);
}

const componentLabels = components
  .filter((item) => !['Header', 'Footer'].includes(item.component))
  .map((item) => cleanText(item.content?.title || item.content?.label || item.component))
  .filter(Boolean);

const actionLabels = [];
for (const item of components) {
  for (const key of ['primaryLabel', 'secondaryLabel', 'buttonLabel', 'label']) {
    const value = cleanText(item.content?.[key]);
    if (value && /버튼|하기|취소|확인|신청|제출|참여|저장|검색/.test(value)) actionLabels.push(value);
  }
  for (const action of item.actions || []) {
    const value = cleanText(action?.label);
    if (value) actionLabels.push(value);
  }
}

const explanation = {
  purpose: cleanText(explanationSource.purpose) || requestedPurpose || (cleanText(parsed.pageName) + ' 화면의 정보 입력과 처리를 지원합니다.'),
  sections: cleanList(explanationSource.sections),
  interactions: cleanList(explanationSource.interactions),
};

if (!explanation.sections.length) {
  explanation.sections = [...new Set(componentLabels)].slice(0, 8).map((label) => label + ' 영역');
}
if (!explanation.interactions.length) {
  explanation.interactions = [...new Set(actionLabels)].slice(0, 6).map((label) => label + ' 동작');
}

return [{ json: {
  pageName: cleanText(parsed.pageName) || '와이어프레임',
  explanation,
  components: components.map((item, index) => ({ ...item, order: index + 1 })),
  warnings,
  generationMode: 'requirements-to-wireframe',
} }];
