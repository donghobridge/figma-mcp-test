const aiItems = $input.all();
const sourceItems = $('Split Out').all();

if (!sourceItems.length) throw new Error('Split Out 결과가 없습니다.');

const firstSource = sourceItems[0].json;
const componentMap = firstSource.data || {};
const allowedComponents = new Set(
  Object.entries(componentMap)
    .filter(([, definition]) => definition.type !== 'layout')
    .map(([name]) => name)
);

function parseJson(raw) {
  const cleaned = String(raw || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(`LLM JSON 파싱 실패: ${error.message}`);
  }
}

const warnings = [];
const coverage = [];
const candidates = [];

aiItems.forEach((item, sourceIndex) => {
  const source = sourceItems[sourceIndex]?.json?.sourceSection || {};
  const parsed = parseJson(item.json.text || item.json.output || '');
  const catalogNodes = sourceItems[sourceIndex]?.json?.catalogNodes || [];
  const refMap = new Map(
    [...(source.textNodes || []), ...catalogNodes]
      .map((textNode) => [textNode.ref, textNode])
  );
  let rawComponents = parsed.status === 'mapped' && Array.isArray(parsed.components)
    ? parsed.components
    : [];

  // 한 개의 TEXT만 가진 독립 영역은 일반적인 페이지/섹션 제목이다.
  // AI가 wrapper로 오판해도 텍스트를 버리지 않도록 일반 규칙으로 보정한다.
  if (!rawComponents.length && (source.textNodes || []).length === 1) {
    const sourceName = String(source.name || '');
    if (/button|btn/i.test(sourceName) && componentMap.Button) {
      rawComponents = [{
        component: 'Button',
        props: { label: source.textNodes[0].ref },
      }];
      warnings.push(`단일 버튼 영역 자동 보정: ${source.nodeId}`);
    } else if (/top|title|heading/i.test(sourceName) && componentMap.SectionHeading) {
      rawComponents = [{
        component: 'SectionHeading',
        props: { title: source.textNodes[0].ref },
      }];
      warnings.push(`단일 제목 영역 자동 보정: ${source.nodeId}`);
    }
  }

  coverage.push({
    sourceNodeId: source.nodeId || parsed.sourceNodeId || '',
    figmaNode: source.name || parsed.figmaNode || '',
    status: rawComponents.length ? 'mapped' : 'unmapped',
    components: rawComponents.map((component) => component.component),
    reason: parsed.reason || '',
  });

  rawComponents.forEach((itemComponent, componentIndex) => {
    const component = itemComponent.component;

    if (!allowedComponents.has(component)) {
      warnings.push(`등록되지 않은 컴포넌트 제외: ${component}`);
      return;
    }

    const definition = componentMap[component] || {};
    const role = definition.role || null;
    const sourceName = String(source.name || '');
    const isHeaderSource = /header|gnb/i.test(sourceName);
    const isFooterSource = /footer/i.test(sourceName);

    if (isHeaderSource && role !== 'header') {
      warnings.push(`GNB의 본문 컴포넌트 오매핑 제외: ${component}`);
      return;
    }

    if (isFooterSource && role !== 'footer') {
      warnings.push(`Footer의 본문 컴포넌트 오매핑 제외: ${component}`);
      return;
    }

    if (role === 'header' && !/header|gnb/i.test(sourceName)) {
      warnings.push(`Header 오매핑 제외: ${source.nodeId}`);
      return;
    }

    if (role === 'footer' && !/footer/i.test(sourceName)) {
      warnings.push(`Footer 오매핑 제외: ${source.nodeId}`);
      return;
    }

    const propNodeIds = {};
    for (const prop of definition.props || []) {
      const ref = String(itemComponent.props?.[prop] || '').trim();
      if (!ref) {
        propNodeIds[prop] = '';
        continue;
      }

      const textNode = refMap.get(ref);
      if (!textNode) {
        warnings.push(`존재하지 않는 TEXT ref 제외: ${component}.${prop}=${ref}`);
        propNodeIds[prop] = '';
        continue;
      }

      propNodeIds[prop] = textNode.nodeId;
    }

    candidates.push({
      sourceNodeId: source.nodeId || '',
      figmaNode: source.name || '',
      component,
      propNodeIds,
      reason: parsed.reason || '',
      sourceIndex,
      componentIndex,
      mappedPropCount: Object.values(propNodeIds).filter(Boolean).length,
      requiredMappedCount: (definition.requiredProps || [])
        .filter((prop) => Boolean(propNodeIds[prop])).length,
      requiredPropCount: (definition.requiredProps || []).length,
      definition,
    });
  });
});

const bestBySourceAndComponent = new Map();
for (const candidate of candidates) {
  const key = `${candidate.sourceNodeId}:${candidate.component}`;
  const previous = bestBySourceAndComponent.get(key);
  if (!previous || candidate.mappedPropCount > previous.mappedPropCount) {
    bestBySourceAndComponent.set(key, candidate);
  }
}

let selected = [...bestBySourceAndComponent.values()];

// sourceSections가 실제 Figma 형제 영역 단위로 분리되어 있으므로 한 영역에는
// 필수값 충족률과 매핑 수가 가장 높은 컴포넌트 하나만 채택한다.
const bestBySource = new Map();
for (const candidate of selected) {
  const previous = bestBySource.get(candidate.sourceNodeId);
  const requiredRatio = candidate.requiredPropCount
    ? candidate.requiredMappedCount / candidate.requiredPropCount
    : candidate.mappedPropCount > 0 ? 0.5 : 0;
  const previousRatio = previous
    ? previous.requiredPropCount
      ? previous.requiredMappedCount / previous.requiredPropCount
      : previous.mappedPropCount > 0 ? 0.5 : 0
    : -1;

  if (
    !previous ||
    requiredRatio > previousRatio ||
    (requiredRatio === previousRatio && candidate.mappedPropCount > previous.mappedPropCount)
  ) {
    bestBySource.set(candidate.sourceNodeId, candidate);
  }
}
selected = [...bestBySource.values()];

selected = selected.filter((candidate) => {
  const candidateNodeIds = Object.values(candidate.propNodeIds).filter(Boolean);
  if (!candidateNodeIds.length) return true;

  return !selected.some((other) => {
    if (other === candidate || other.sourceNodeId !== candidate.sourceNodeId) return false;
    const candidateProps = candidate.definition.props || [];
    const otherProps = other.definition.props || [];
    if (candidateProps.length >= otherProps.length) return false;
    if (!candidateProps.every((prop) => otherProps.includes(prop))) return false;
    const otherNodeIds = new Set(Object.values(other.propNodeIds).filter(Boolean));
    return candidateNodeIds.every((nodeId) => otherNodeIds.has(nodeId));
  });
});

for (const [component, definition] of Object.entries(componentMap)) {
  if (definition.required !== true) continue;
  if (selected.some((item) => item.component === component)) continue;

  selected.push({
    sourceNodeId: '',
    figmaNode: definition.role || component,
    component,
    propNodeIds: {},
    reason: 'component-map required 컴포넌트 자동 삽입',
    sourceIndex: definition.role === 'header' ? -100000 : 100000,
    componentIndex: 0,
    mappedPropCount: 0,
    definition,
  });
  warnings.push(`필수 컴포넌트 자동 삽입: ${component}`);
}

selected.sort((first, second) => {
  const firstRole = first.definition.role;
  const secondRole = second.definition.role;
  const firstOrder = firstRole === 'header' ? -1000000 : firstRole === 'footer' ? 1000000 : first.sourceIndex;
  const secondOrder = secondRole === 'header' ? -1000000 : secondRole === 'footer' ? 1000000 : second.sourceIndex;
  return firstOrder - secondOrder || first.componentIndex - second.componentIndex;
});

return [{
  json: {
    pageName: firstSource.pageName || 'Generated Page',
    pageNodeId: firstSource.pageNodeId || '',
    coverage,
    components: selected.map((item, index) => ({
      order: index + 1,
      sourceNodeId: item.sourceNodeId,
      figmaNode: item.figmaNode,
      component: item.component,
      propNodeIds: item.propNodeIds,
      reason: item.reason,
    })),
    warnings: [...new Set(warnings)],
  },
}];
