const input = $input.first().json;
const extractedMap = $('Extract component map').first().json || {};
const componentMap = extractedMap.data && typeof extractedMap.data === 'object'
  ? extractedMap.data
  : extractedMap;
const prepared = $('Figma 와이어프레임 정리').first().json || {};
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
    throw new Error('와이어프레임 명세 JSON 파싱 실패: ' + error.message);
  }
}

function cleanText(value) {
  const text = String(value == null ? '' : value)
    .replace(/\{ts\d+\}|\{\/ts\d+\}/g, '')
    .trim();
  if (/^\{[^{}]+\}$/.test(text) || /^\[[^\[\]]+\]$/.test(text)) return '';
  return text;
}

const warnings = Array.isArray(prepared.warnings) ? prepared.warnings.slice() : [];
const errors = [];
const forbidden = new Set(['PageLayout', 'DetailLayout', 'EventParticipationForm']);

function requiredFallback(component, prop) {
  const byKey = {
    searchLabel: '주소 검색',
    buttonLabel: '파일 첨부',
    secondaryLabel: '취소',
    primaryLabel: '확인',
    allLabel: '전체 동의',
    item1: '홈',
  };
  if (byKey[prop]) return byKey[prop];
  if (prop.toLowerCase().includes('href')) return '#';
  if (prop === 'title') return component === 'FormCard' ? '정보' : '페이지';
  if (prop === 'label') return '입력 항목';
  return '';
}

function normalize(item, depth = 0) {
  if (!item || typeof item !== 'object') return null;
  const component = cleanText(item.component);
  const definition = componentMap[component];
  if (!definition || forbidden.has(component)) {
    warnings.push('등록되지 않았거나 사용할 수 없는 컴포넌트 제외: ' + (component || '(없음)'));
    return null;
  }

  const source = item.content && typeof item.content === 'object' ? item.content : {};
  const content = {};
  for (const prop of definition.props || []) {
    if (prop.endsWith('Html')) continue;
    content[prop] = cleanText(source[prop]);
  }

  for (const prop of definition.requiredProps || []) {
    if (prop.endsWith('Html') || content[prop]) continue;
    const fallback = requiredFallback(component, prop);
    if (fallback) {
      content[prop] = fallback;
      warnings.push(`${component}.${prop} 누락값을 기본 UI 문구로 보완했습니다.`);
    } else {
      warnings.push(`필수값 누락: ${component}.${prop}`);
    }
  }

  const output = { component, content, children: [] };
  for (const key of ['options', 'items']) {
    if (Array.isArray(item[key])) output[key] = item[key].map(cleanText).filter(Boolean).slice(0, 30);
  }
  if (Array.isArray(item.actions)) {
    output.actions = item.actions
      .map((action) => ({ label: cleanText(action?.label), href: cleanText(action?.href) || '#' }))
      .filter((action) => action.label)
      .slice(0, 10);
  }
  if (depth < 3 && Array.isArray(item.children)) {
    output.children = item.children.map((child) => normalize(child, depth + 1)).filter(Boolean);
  }
  return output;
}

const parsed = parseJson(raw);
let components = (Array.isArray(parsed.components) ? parsed.components : [])
  .map((item) => normalize(item))
  .filter(Boolean);

// 작은 로컬 모델이 페이지 제목 컴포넌트를 누락해도 전체 생성을 중단하지 않는다.
// AI가 반환한 pageName을 우선 사용하고, 없으면 Figma 최상위 프레임명을 사용한다.
const recoveredPageTitle = cleanText(parsed.pageName)
  || cleanText(prepared.pageName)
  || '페이지';
const headingIndexes = [];
for (let index = 0; index < components.length; index += 1) {
  if (components[index].component === 'SectionHeading') headingIndexes.push(index);
}

if (!headingIndexes.length) {
  components.unshift({
    component: 'SectionHeading',
    content: { title: recoveredPageTitle, description: '' },
    children: [],
  });
  warnings.push('SectionHeading이 누락되어 pageName으로 자동 복구했습니다.');
} else {
  const firstHeading = components[headingIndexes[0]];
  if (!cleanText(firstHeading.content?.title)) {
    firstHeading.content.title = recoveredPageTitle;
    warnings.push('비어 있는 SectionHeading.title을 pageName으로 자동 복구했습니다.');
  }
  if (headingIndexes.length > 1) {
    let headingSeen = false;
    components = components.filter((item) => {
      if (item.component !== 'SectionHeading') return true;
      if (!headingSeen) {
        headingSeen = true;
        return true;
      }
      return false;
    });
    warnings.push('중복 SectionHeading을 하나로 정리했습니다.');
  }
}

components = components.filter((item) => !['Header', 'Footer', 'PortalHeader', 'PortalFooter'].includes(item.component));
components.unshift({ component: 'Header', content: {}, children: [] });
components.push({ component: 'Footer', content: {}, children: [] });

function flatten(items, output = []) {
  for (const item of items) {
    output.push(item);
    flatten(item.children || [], output);
  }
  return output;
}

const flattened = flatten(components);
const usedComponents = new Set(flattened.map((item) => item.component));
for (const component of prepared.annotationComponents || []) {
  const normalizedName = component === 'PortalHeader' ? 'Header' : component === 'PortalFooter' ? 'Footer' : component;
  if (componentMap[normalizedName] && !usedComponents.has(normalizedName)) {
    warnings.push('라벨 미반영: ' + normalizedName);
  }
}

// 태그 기반 와이어프레임에서는 AI가 라벨을 누락한 결과를 성공으로 저장하지 않는다.
// Header/Footer는 후처리에서 공통 컴포넌트로 삽입하므로 개수 비교에서 제외한다.
if (prepared.annotationMode === 'tagged') {
  const expectedCounts = {};
  const actualCounts = {};
  for (const annotation of prepared.annotations || []) {
    const name = annotation.component === 'PortalHeader'
      ? 'Header'
      : annotation.component === 'PortalFooter'
        ? 'Footer'
        : annotation.component;
    if (['Header', 'Footer'].includes(name)) continue;
    expectedCounts[name] = (expectedCounts[name] || 0) + 1;
  }
  for (const item of flattened) {
    if (['Header', 'Footer'].includes(item.component)) continue;
    actualCounts[item.component] = (actualCounts[item.component] || 0) + 1;
  }
  const missingMappings = Object.entries(expectedCounts)
    .filter(([name, count]) => (actualCounts[name] || 0) < count)
    .map(([name, count]) => `${name} ${actualCounts[name] || 0}/${count}`);
  if (missingMappings.length) {
    throw new Error('Figma 라벨 매핑 누락: ' + missingMappings.join(', '));
  }
}

if (errors.length) warnings.push(...[...new Set(errors)].map((error) => '검증 경고: ' + error));

return [{
  json: {
    pageName: cleanText(parsed.pageName) || cleanText(prepared.pageName) || 'Figma Wireframe',
    components: components.map((item, index) => ({ ...item, order: index + 1 })),
    warnings,
    sourceNodeCount: prepared.nodeCount || 0,
    annotationCount: (prepared.annotations || []).length,
    annotatedComponents: prepared.annotationComponents || [],
    generationMode: prepared.annotationMode === 'tagged'
      ? 'figma-tagged-wireframe'
      : 'figma-structure-wireframe',
  },
}];
