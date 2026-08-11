const aiItems = $input.all();
const sourceItems = $('Split Out').all();

if (!sourceItems.length) throw new Error('Split Out 결과가 없습니다.');

const firstSource = sourceItems[0].json;
const componentMap = firstSource.data || {};
const allowed = new Set(
  Object.entries(componentMap)
    .filter(([, definition]) => definition.type !== 'layout')
    .map(([name]) => name)
);

function parseAi(raw) {
  const cleaned = String(raw || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

const isDate = (text) => /\b(?:19|20)\d{2}(?:[.\-/]\d{1,2}[.\-/]\d{1,2}|년\s*\d{1,2}월\s*\d{1,2}일)\b/.test(text);
const isPhone = (text) => /(?:0\d{1,2}[-\s)]*)?\d{3,4}[-\s]\d{4}/.test(text);
const isTag = (text) => /^#\S+/.test(text);
const isFile = (text) => /\.[a-z0-9]{2,6}(?:$|[?#])/i.test(text);
const isMoney = (text) => /(?:₩|원\b|\d{1,3}(?:,\d{3})+)/.test(text);

function inferComponent(source, ai) {
  const name = String(source.name || '');
  const nodes = source.textNodes || [];
  const texts = nodes.map((node) => String(node.text || ''));
  const catalog = firstSource.catalogNodes || [];

  if (/header|gnb/i.test(name) && allowed.has('Header')) return 'Header';
  if (/footer/i.test(name) && allowed.has('Footer')) return 'Footer';
  if (/breadcrumb|bread-crumb/i.test(name) && allowed.has('Breadcrumb')) return 'Breadcrumb';
  if (/data-table|payment-table|table/i.test(name) && allowed.has('DataTable')) return 'DataTable';
  if (/(^|[-_\s])tabs?($|[-_\s])|tab-list/i.test(name) && allowed.has('Tabs')) return 'Tabs';
  if (/pagination|paging/i.test(name) && allowed.has('Pagination')) return 'Pagination';
  if (/loan-summary|summary-bar|balance-summary|repayment-summary|잔액요약/i.test(name) && allowed.has('SummaryBar')) return 'SummaryBar';
  if (/total-amount|amount-summary/i.test(name) && allowed.has('AmountSummary')) return 'AmountSummary';
  if (/loan-card|loan-item/i.test(name) && allowed.has('LoanCard')) return 'LoanCard';
  if (/basic-info|business-info|key-value|신청내역|application-details|repayment-details|detail-list/i.test(name) && allowed.has('KeyValueCard')) return 'KeyValueCard';
  if (/accordion|guide/i.test(name) && allowed.has('GuideAccordion')) return 'GuideAccordion';
  if (/application-date|date-card/i.test(name) && allowed.has('ApplicationDateCard')) return 'ApplicationDateCard';
  if (/empty|no-data/i.test(name) && allowed.has('EmptyState')) return 'EmptyState';
  if (/status-badge|badge|chip/i.test(name) && allowed.has('StatusBadge')) return 'StatusBadge';
  if (/card-list|participation-form|survey-form/i.test(name) && allowed.has('EventParticipationForm')) {
    return 'EventParticipationForm';
  }
  if (/checkbox|check-item/i.test(name) && allowed.has('FormCheckbox')) return 'FormCheckbox';
  if (/button|btn/i.test(name) && texts.length >= 2 && allowed.has('FormButtonGroup')) {
    return texts.length > 2 && allowed.has('ActionButtonGroup') ? 'ActionButtonGroup' : 'FormButtonGroup';
  }
  if (/button|btn/i.test(name) && allowed.has('Button')) return 'Button';
  if (texts.some(isPhone) && allowed.has('ContactBar')) return 'ContactBar';
  if (texts.some(isTag) && allowed.has('AnswerPanel')) return 'AnswerPanel';
  if (
    texts.some(isDate) &&
    texts.length <= 5 &&
    texts.every((text) => text.length < 160) &&
    allowed.has('CaseHeader')
  ) {
    return 'CaseHeader';
  }
  if (texts.some((text) => text.length >= 160) && allowed.has('QuestionContent')) {
    return 'QuestionContent';
  }
  if (
    texts.length >= 2 &&
    texts.every((text) => text.length < 40) &&
    catalog.some((node) => isFile(node.text)) &&
    allowed.has('AttachmentList')
  ) {
    return 'AttachmentList';
  }
  if (texts.length === 1 && allowed.has('SectionHeading')) return 'SectionHeading';

  const aiComponents = Array.isArray(ai.components) ? ai.components : [];
  const fallback = aiComponents.find((item) => allowed.has(item.component));
  if (fallback?.component) return fallback.component;
  if (texts.length >= 4 && texts.every((text) => text.length < 100) && allowed.has('GenericList')) return 'GenericList';
  if (texts.length && allowed.has('GenericSection')) return 'GenericSection';
  return '';
}

function buildPropNodeIds(component, source, ai) {
  const definition = componentMap[component] || {};
  const sectionNodes = [...(source.textNodes || [])];
  const catalogNodes = [...(firstSource.catalogNodes || [])];
  const result = Object.fromEntries((definition.props || []).map((prop) => [prop, '']));
  const used = new Set();

  const aiComponent = (Array.isArray(ai.components) ? ai.components : [])
    .find((item) => item.component === component);
  const refMap = new Map([...sectionNodes, ...catalogNodes].map((node) => [node.ref, node]));
  for (const [prop, ref] of Object.entries(aiComponent?.props || {})) {
    const node = refMap.get(ref);
    if (node && Object.prototype.hasOwnProperty.call(result, prop)) {
      result[prop] = node.nodeId;
      used.add(node.nodeId);
    }
  }

  const take = (predicate) => {
    const node = sectionNodes.find((candidate) => !used.has(candidate.nodeId) && predicate(candidate.text));
    if (node) used.add(node.nodeId);
    return node || null;
  };
  const remaining = () => sectionNodes.filter((node) => !used.has(node.nodeId));
  const set = (prop, node) => {
    if (node && Object.prototype.hasOwnProperty.call(result, prop) && !result[prop]) result[prop] = node.nodeId;
  };

  if (component === 'SectionHeading') {
    set('title', sectionNodes[0]);
  } else if (component === 'Button') {
    set('label', sectionNodes[0]);
  } else if (component === 'FormButtonGroup') {
    set('secondaryLabel', sectionNodes[0]);
    set('primaryLabel', sectionNodes[1]);
  } else if (component === 'FormCheckbox') {
    set('label', sectionNodes[0]);
  } else if (component === 'CaseHeader') {
    set('date', take(isDate));
    const title = [...remaining()].sort((a, b) => b.text.length - a.text.length)[0];
    if (title) used.add(title.nodeId);
    set('title', title);
    const badges = remaining();
    set('badge1', badges[0]);
    set('badge2', badges[1]);
  } else if (component === 'ContactBar') {
    set('phone', take(isPhone));
    const values = remaining();
    set('category', values[0]);
    set('name', values[1]);
  } else if (component === 'AttachmentList') {
    const labels = sectionNodes;
    const file = catalogNodes.find((node) => isFile(node.text));
    set('type1', labels[0]);
    set('file1', file);
    set('type2', labels[1]);
    set('file2', file);
  } else if (component === 'QuestionContent') {
    const description = [...sectionNodes].sort((a, b) => b.text.length - a.text.length)[0];
    if (description) used.add(description.nodeId);
    set('description', description);
    const values = remaining();
    set('label', values[0]);
    set('category', values[1]);
  } else if (component === 'AnswerPanel') {
    const tags = sectionNodes.filter((node) => isTag(node.text));
    tags.forEach((node) => used.add(node.nodeId));
    set('tag1', tags[0]);
    set('tag2', tags[1]);
    set('noticeDate', take(isDate));

    const description = [...remaining()].sort((a, b) => b.text.length - a.text.length)[0];
    if (description) used.add(description.nodeId);
    set('description', description);

    const ordered = remaining();
    const title = ordered.shift();
    if (title) used.add(title.nodeId);
    set('title', title);

    const noticeCandidates = remaining();
    const noticeMessage = [...noticeCandidates].sort((a, b) => b.text.length - a.text.length)[0];
    if (noticeMessage) used.add(noticeMessage.nodeId);
    set('noticeMessage', noticeMessage);

    const noticeTitle = remaining()[0];
    if (noticeTitle) used.add(noticeTitle.nodeId);
    set('noticeTitle', noticeTitle);

    const costLabels = remaining();
    set('costLabel1', costLabels[0]);
    set('costLabel2', costLabels[1]);
    const money = catalogNodes.find((node) => isMoney(node.text));
    set('costValue1', money);
    set('costValue2', money);
  } else {
    const available = remaining();
    for (const prop of definition.textProps || definition.props || []) {
      if (result[prop] || prop.endsWith('Html') || /href/i.test(prop)) continue;
      const node = available.shift();
      if (!node) break;
      used.add(node.nodeId);
      set(prop, node);
    }
  }

  return result;
}

const warnings = [];
const coverage = [];
const components = [];

sourceItems.forEach((sourceItem, sourceIndex) => {
  const source = sourceItem.json.sourceSection || {};
  const ai = parseAi(aiItems[sourceIndex]?.json?.text || aiItems[sourceIndex]?.json?.output || '');
  let component = inferComponent(source, ai);

  if (!component) {
    coverage.push({
      sourceNodeId: source.nodeId || '',
      figmaNode: source.name || '',
      status: 'unmapped',
      components: [],
      reason: '구조 규칙과 AI 결과에서 적합한 컴포넌트를 찾지 못함',
    });
    return;
  }

  let propNodeIds = buildPropNodeIds(component, source, ai);
  let definition = componentMap[component] || {};
  let missing = (definition.requiredProps || []).filter((prop) => !propNodeIds[prop]);

  if (missing.length) {
    const rejectedComponent = component;
    const rejectedMissingProps = [...missing];
    if ((source.textNodes || []).length && allowed.has('GenericSection')) {
      component = 'GenericSection';
      propNodeIds = buildPropNodeIds(component, source, {});
      definition = componentMap[component] || {};
      missing = [];
      warnings.push(
        `필수값 부족으로 범용 컴포넌트 적용: ${rejectedComponent} → GenericSection (${rejectedMissingProps.join(',')})`
      );
    } else {
      warnings.push(`필수값 부족으로 컴포넌트 제외: ${component}.${missing.join(',')}`);
      coverage.push({
        sourceNodeId: source.nodeId || '',
        figmaNode: source.name || '',
        status: 'unmapped',
        components: [],
        reason: `필수값 부족: ${missing.join(', ')}`,
      });
      return;
    }
  }

  coverage.push({
    sourceNodeId: source.nodeId || '',
    figmaNode: source.name || '',
    status: 'mapped',
    components: [component],
    reason: 'Figma 영역 구조와 텍스트 형식으로 확정',
  });
  components.push({
    sourceNodeId: source.nodeId || '',
    figmaNode: source.name || '',
    component,
    propNodeIds,
    reason: '결정형 구조 매핑',
    sourceIndex,
  });
});

for (const [component, definition] of Object.entries(componentMap)) {
  if (definition.required !== true) continue;
  if (components.some((item) => item.component === component)) continue;
  components.push({
    sourceNodeId: '',
    figmaNode: definition.role || component,
    component,
    propNodeIds: {},
    reason: '필수 공통 컴포넌트 자동 삽입',
    sourceIndex: definition.role === 'header' ? -100000 : 100000,
  });
}

components.sort((a, b) => {
  const aRole = componentMap[a.component]?.role;
  const bRole = componentMap[b.component]?.role;
  const aOrder = aRole === 'header' ? -1000000 : aRole === 'footer' ? 1000000 : a.sourceIndex;
  const bOrder = bRole === 'header' ? -1000000 : bRole === 'footer' ? 1000000 : b.sourceIndex;
  return aOrder - bOrder;
});

return [{
  json: {
    pageName: firstSource.pageName || 'Generated Page',
    pageNodeId: firstSource.pageNodeId || '',
    coverage,
    components: components.map((item, index) => ({
      order: index + 1,
      sourceNodeId: item.sourceNodeId,
      figmaNode: item.figmaNode,
      component: item.component,
      propNodeIds: item.propNodeIds,
      reason: item.reason,
    })),
    warnings,
  },
}];
