/**
 * MCP 텍스트 + component-map → pageSpec (섹션 순서/컴포넌트/props)
 * - 순서는 MCP NODES FRAME 트리에서 추출 (화면별 하드코딩 금지)
 * - 컴포넌트는 map 키/figmaNames 정확 매칭 (짧은 별칭 fuzzy 금지)
 * - Table_A* 연속 행 → KeyValueCard 하나로 병합
 * - FormCard(acceptsChildren)는 부모+자식 모두 유지
 */
module.exports = function ($input, helpers) {
  const inputJson = $input.first().json || {};
  const prepared = inputJson.prepared
    || (helpers && helpers.prepared)
    || {};
  const extractedMap = inputJson.extractedMap
    || (helpers && helpers.extractedMap)
    || {};
  const componentMap = extractedMap.data && typeof extractedMap.data === 'object'
    ? extractedMap.data
    : extractedMap;
  const runConfig = prepared.runConfig
    || (helpers && helpers.runConfig)
    || inputJson.runConfig
    || {};

  const mcpText = String(prepared.mcpText || inputJson.mcpText || '').trim();
  if (!mcpText) throw new Error('MCP 텍스트가 없습니다.');
  if (!componentMap || typeof componentMap !== 'object' || !Object.keys(componentMap).length) {
    throw new Error('component-map이 비어 있습니다.');
  }

  function cleanText(value) {
    return String(value == null ? '' : value)
      .replace(/\{ts\d+\}/gi, '')
      .replace(/\{\/ts\d+\}/gi, '')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\[/g, '[')
      .replace(/\\\]/g, ']')
      .replace(/\\\n/g, '\n')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isNoise(text) {
    const t = cleanText(text);
    if (!t) return true;
    if (/^[\s○●◎◯◉□■☐☑✓✔✕✖×><›‹·•‧∙]+$/u.test(t)) return true;
    if (/^(다운로드|바로보기|취소|닫기|검색|LOGO|IMAGE)$/i.test(t)) return true;
    if (/^•?\s*[A-Za-z][\w.]*\s*:/.test(t)) return true;
    return false;
  }

  function parseNodes(raw) {
    const idx = raw.search(/(?:^|\n)NODES:\s*\n/);
    const part = idx >= 0 ? raw.slice(idx) : raw;
    const lines = part.split(/\r?\n/);
    const nodes = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const m = line.match(
        /^(\s*)\[(FRAME|INSTANCE|COMPONENT|COMPONENT_SET|GROUP|SECTION|TEXT)\](?:\s+"([^"]*)")?/
      );
      if (!m) continue;
      const indent = m[1].length;
      const type = m[2];
      const name = cleanText(m[3] || '');
      const id = ((line.match(/\s#([0-9]+[:\-][0-9]+(?:;[^ \t]+)?)/) || [])[1] || '').replace(/-/g, ':');
      let text = '';
      const textAttr = line.match(/\btext="((?:\\.|[^"\\])*)"/);
      if (textAttr) text = cleanText(textAttr[1].replace(/\\"/g, '"'));
      nodes.push({
        index: nodes.length,
        line: i,
        indent,
        depth: Math.floor(indent / 2),
        type,
        name,
        id,
        text,
      });
    }
    return nodes;
  }

  function endIndex(nodes, startIdx) {
    const start = nodes[startIdx];
    for (let i = startIdx + 1; i < nodes.length; i += 1) {
      if (nodes[i].depth <= start.depth) return i;
    }
    return nodes.length;
  }

  function collectTexts(nodes, startIdx) {
    const start = nodes[startIdx];
    const out = [];
    for (let i = startIdx + 1; i < nodes.length; i += 1) {
      const n = nodes[i];
      if (n.depth <= start.depth) break;
      if (n.type === 'TEXT' && n.text && !isNoise(n.text)) out.push(n.text);
    }
    return out;
  }

  // exact alias index only
  const nameToComponent = new Map();
  for (const [key, def] of Object.entries(componentMap)) {
    if (!def || typeof def !== 'object' || def.type === 'layout') continue;
    const aliases = [key, ...(def.figmaNames || []), ...(def.aliases || [])];
    for (const a of aliases) {
      const token = String(a || '').trim();
      if (!token) continue;
      // 너무 짧은/모호한 별칭은 정확 매칭만 (card, heading 등 fuzzy 금지)
      nameToComponent.set(token.toLowerCase(), key);
    }
  }

  function isTableRowName(name) {
    return /^table_a(_pc)?(_\d+)?$/i.test(String(name || '').trim());
  }

  function resolveComponent(frameName) {
    const raw = String(frameName || '').trim();
    if (!raw) return null;
    // Table_A* 는 KeyValueCard 행 — 단독 섹션으로 올리지 않음 (부모 KV에 흡수)
    if (isTableRowName(raw)) return null;
    const lower = raw.toLowerCase();
    if (nameToComponent.has(lower)) return nameToComponent.get(lower);
    return null;
  }

  function assignLabelValuePairs(props, texts, start = 1, max = 12) {
    const usable = texts.filter((t) => !isNoise(t));
    let i = 0;
    let n = start;
    while (i < usable.length && n <= max) {
      const a = usable[i];
      const b = usable[i + 1];
      if (b != null) {
        props[`label${n}`] = a;
        props[`value${n}`] = b;
        i += 2;
        n += 1;
      } else {
        if (!props.title) props.title = a;
        i += 1;
      }
    }
    return props;
  }

  function assignProps(componentKey, texts) {
    const def = componentMap[componentKey] || {};
    const propNames = Array.isArray(def.textProps) && def.textProps.length
      ? def.textProps.slice()
      : (Array.isArray(def.props) ? def.props.slice() : []);
    const propTypes = def.propTypes || {};
    const props = {};
    const used = new Set();
    const pool = texts.map(cleanText).filter((t) => t && !isNoise(t));

    function take(pred) {
      const i = pool.findIndex((t, idx) => !used.has(idx) && pred(t));
      if (i < 0) return '';
      used.add(i);
      return pool[i];
    }

    function isTag(t) { return /^#[^\s#]+$/.test(t) || /^#\s*[^\s#]+$/.test(t); }
    function isMoney(t) { return /\d{1,3}(?:,\d{3})+\s*원|\d+\s*원/.test(t); }
    function isDate(t) { return /\d{4}[.\-/년]/.test(t); }
    function isPhone(t) {
      return /^\d{2,4}-\d{3,4}-\d{4}$/.test(t) || /\d{2,4}[-\s]\d{3,4}[-\s]\d{4}/.test(t);
    }

    if (componentKey === 'KeyValueCard' || componentKey === 'SummaryBar') {
      if (componentKey === 'KeyValueCard' && pool[0] && pool[0].length <= 40
        && !isMoney(pool[0]) && !isDate(pool[0])) {
        props.title = pool[0];
        used.add(0);
      }
      const rest = pool.filter((_, idx) => !used.has(idx));
      assignLabelValuePairs(props, rest, 1, 12);
      return props;
    }

    if (componentKey === 'CaseHeader' || componentKey === 'DetailContentHeader') {
      // 제목 먼저 (배지가 제목을 가져가지 않도록)
      props.title = take((t) => t.length >= 8 && t.length <= 120 && !isDate(t) && !isPhone(t) && !isTag(t) && !/^(법률|법무|온라인|분쟁)/.test(t));
      if (!props.title) {
        props.title = take((t) => t.length >= 6 && t.length <= 120 && !isDate(t) && !isPhone(t) && !isTag(t));
      }
      if (props.title) {
        const m = props.title.match(/^\[([^\]]+)\]\s*(.*)$/);
        if (m) {
          props.status = m[1];
          props.title = m[2] || props.title;
        }
      }
      props.badge1 = take((t) => t.length <= 24 && !isDate(t) && !isTag(t) && t !== props.title);
      props.badge2 = take((t) => t.length <= 24 && !isDate(t) && !isTag(t) && t !== props.title);
      props.badge3 = take((t) => t.length <= 24 && !isDate(t) && !isTag(t) && t !== props.title);
      const date = take(isDate);
      if (date) {
        props.date = date;
        props.meta1 = `작성일 : ${date}`;
      }
      props.meta2 = take((t) => /작성자|조회/.test(t) || (t.length <= 40 && /\*/.test(t)));
      props.meta3 = take((t) => /조회/.test(t));
      props.likeCount = take((t) => /^\d{1,4}$/.test(t)) || '';
      return props;
    }

    if (componentKey === 'AnswerPanel') {
      props.title = take((t) => /상담답변|답변/.test(t) && t.length <= 40) || '상담답변';
      props.noticeDate = take(isDate);
      props.tag1 = take(isTag);
      props.tag2 = take(isTag);
      props.costValue1 = take(isMoney);
      props.costValue2 = take(isMoney);
      props.costLabel1 = take((t) => /비용|금액/.test(t) && t.length <= 20) || (props.costValue1 ? '소송비용' : '');
      props.costLabel2 = take((t) => /비용|금액/.test(t) && t.length <= 20) || (props.costValue2 ? '발생비용' : '');
      props.noticeTitle = take((t) => /보완|요청|안내|공지|상담답변/.test(t) && t.length <= 30);
      props.noticeMessage = take((t) => t.length >= 8 && t.length <= 80 && !isMoney(t) && !isDate(t) && !isTag(t));
      props.description = take((t) => t.length >= 40) || take((t) => t.length >= 20);
      return props;
    }

    if (componentKey === 'AnswerArea') {
      props.tag1 = take(isTag);
      props.tag2 = take(isTag);
      const long = take((t) => t.length >= 40) || take((t) => t.length >= 20);
      if (long) props.bodyHtml = long.replace(/\n/g, '<br/>');
      return props;
    }

    if (componentKey === 'QuestionArea') {
      const long = take((t) => t.length >= 40) || take((t) => t.length >= 20);
      if (long) props.bodyHtml = long.replace(/\n/g, '<br/>');
      return props;
    }

    if (componentKey === 'QuestionContent') {
      props.description = take((t) => t.length >= 40) || take((t) => t.length >= 20);
      props.category = take((t) => t.length <= 60 && (/:/.test(t) || /분쟁|법률|상담/.test(t)));
      props.label = take((t) => /신청|내용|문의/.test(t) && t.length <= 40);
      return props;
    }

    if (componentKey === 'AdvisorProfile') {
      props.name = take((t) => /위원|상담|자문/.test(t) || (t.length <= 30 && t.length >= 2));
      props.field = take((t) => t.length <= 20 && !isDate(t));
      props.region = take((t) => t.length <= 10 && !isDate(t));
      props.imageSrc = '/assets/img/pages/contents/advisor-img-03.png';
      return props;
    }

    if (componentKey === 'BackToList') {
      props.label = take((t) => /목록|뒤로|이전/.test(t)) || '목록';
      props.href = '#';
      return props;
    }

    if (componentKey === 'Button' || componentKey === 'ActionButton') {
      props.label = take((t) => t.length <= 20) || '확인';
      props.href = '#';
      return props;
    }

    if (componentKey === 'PageTitleDisplay' || componentKey === 'SectionHeading') {
      props.title = take((t) => t.length >= 2 && t.length <= 40 && !isDate(t)) || take((t) => t.length <= 40);
      return props;
    }

    if (componentKey === 'Breadcrumb' || componentKey === 'BreadcrumbGroup') {
      let i = 1;
      while (i <= 5) {
        const v = take((t) => t.length <= 40 && !isDate(t) && !/^홈$/.test(t));
        if (!v) break;
        props[`item${i}`] = v;
        i += 1;
      }
      return props;
    }

    if (componentKey === 'BoardFilterBar') {
      props.dateStart = take(isDate) || '2025.01.01';
      props.dateEnd = take(isDate) || '2025.06.30';
      props.filterLabel1 = take((t) => /분야|카테고리/.test(t)) || '상담분야';
      props.filterValue1 = take((t) => t.length <= 20) || '법률/법무';
      props.filterLabel2 = take((t) => /유형|타입/.test(t)) || '상담유형';
      props.filterValue2 = take((t) => t.length <= 20) || '전화상담';
      props.searchPlaceholder = take((t) => /검색/.test(t)) || '검색어를 입력해 주세요.';
      props.searchLabel = take((t) => /조회|검색/.test(t)) || '조회하기';
      return props;
    }

    if (componentKey === 'BoardList') {
      props.resultTitle = take((t) => /검색결과|건/.test(t)) || take((t) => t.length <= 30) || '검색결과';
      return props;
    }

    if (componentKey === 'BoardListItem') {
      props.category = take((t) => t.length <= 20 && /법률|노무|경영|세무|법무|컨설팅/.test(t)) || take((t) => t.length <= 16);
      props.badge = take((t) => t.length <= 24);
      props.title = take((t) => t.length >= 4 && t.length <= 80 && !isDate(t));
      props.advisor = take((t) => t.length <= 16 && !isDate(t));
      props.consultType = take((t) => /상담|대면|전화|온라인/.test(t) && t.length <= 16) || take((t) => t.length <= 16);
      props.date = take(isDate);
      props.likeCount = take((t) => /^\d{1,5}$/.test(t)) || '0';
      props.viewCount = take((t) => /^\d{1,5}$/.test(t)) || '0';
      return props;
    }

    if (componentKey === 'Pagination' || componentKey === 'PaginationBar') {
      props.page1 = take((t) => /^\d+$/.test(t)) || '1';
      props.page2 = take((t) => /^\d+$/.test(t)) || '2';
      props.page3 = take((t) => /^\d+$/.test(t)) || '3';
      props.page4 = take((t) => /^\d+$/.test(t)) || '4';
      props.pageLast = take((t) => /^\d+$/.test(t)) || '23';
      return props;
    }

    if (componentKey === 'EmptyDataPublic') {
      props.message = take((t) => t.length >= 4) || '조회된 결과가 없습니다.';
      props.buttonLabel = take((t) => /목록|확인/.test(t)) || '목록으로';
      props.buttonHref = '#';
      props.imageSrc = '/assets/img/pages/contents/content-empty-data-character.svg';
      return props;
    }

    for (const prop of propNames) {
      if (props[prop]) continue;
      const pType = String(propTypes[prop] || '');
      let value = '';
      if (/phone/i.test(pType) || /phone|tel|연락/i.test(prop)) {
        value = take(isPhone);
      } else if (/date/i.test(pType) || /date|일자|일시/i.test(prop)) {
        value = take(isDate);
      } else if (/file/i.test(pType) || /file|파일/i.test(prop)) {
        value = take((t) => /\.(pdf|png|jpe?g|docx?|hwp)$/i.test(t));
      } else if (/href/i.test(pType) || /href|url/i.test(prop)) {
        value = '#';
      } else if (/tag/i.test(pType)) {
        value = take(isTag);
      } else if (/html/i.test(pType)) {
        continue;
      } else if (/longText|description|content/i.test(pType) || /description|content|본문|안내|helper|bodyHtml/i.test(prop)) {
        value = take((t) => t.length >= 40);
      } else if (/money/i.test(pType)) {
        value = take(isMoney);
      } else if (/label|badge|tag|status|title|category|name/i.test(prop)) {
        value = take((t) => t.length > 0 && t.length <= 80 && !/\.(pdf|png)$/i.test(t));
      } else {
        value = take((t) => t.length > 0 && t.length <= 120);
      }
      if (value) props[prop] = value;
    }

    if (componentKey === 'GuideAccordion') {
      const longs = pool.filter((_, idx) => !used.has(idx) && pool[idx].length >= 20);
      if (longs.length) {
        props.contentHtml = longs.map((t) => `<p>${t}</p>`).join('');
      }
      if (!props.title) props.title = '유의사항';
    }

    if (!props.description && !props.contentHtml && !props.helper && !props.bodyHtml) {
      const long = take((t) => t.length >= 40);
      if (long) {
        if (propNames.includes('description')) props.description = long;
        else if (propNames.includes('bodyHtml')) props.bodyHtml = long;
        else if (propNames.includes('helper')) props.helper = long;
        else if (propNames.includes('contentHtml')) props.contentHtml = `<p>${long}</p>`;
      }
    }

    return props;
  }

  const nodes = parseNodes(mcpText);
  if (!nodes.length) throw new Error('MCP NODES를 파싱하지 못했습니다.');

  const skipNames = /^(wrapper|content|item|box|grid|columns|fixed-con|info|title|text|row|col)$/i;
  const shellNames = /^(header|footer|gnb)$/i;

  const candidates = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const n = nodes[i];
    if (n.type !== 'FRAME' && n.type !== 'INSTANCE' && n.type !== 'COMPONENT') continue;
    if (!n.name || skipNames.test(n.name) || shellNames.test(n.name)) continue;
    const component = resolveComponent(n.name);
    if (!component) continue;
    if (/^(Header|Footer|GNB)$/i.test(component)) continue;
    candidates.push({ index: i, node: n, component, end: endIndex(nodes, i) });
  }

  // 자식 선호 시: acceptsChildren 부모는 유지, 그 외 부모는 제거
  const chosen = [];
  for (const c of candidates) {
    let skip = false;
    for (let j = chosen.length - 1; j >= 0; j -= 1) {
      const prev = chosen[j];
      if (c.index > prev.index && c.index < prev.end) {
        const prevDef = componentMap[prev.component] || {};
        if (prevDef.acceptsChildren) {
          // keep both
        } else {
          chosen.splice(j, 1);
        }
      } else if (prev.index > c.index && prev.index < c.end) {
        const cDef = componentMap[c.component] || {};
        if (!cDef.acceptsChildren) skip = true;
      }
    }
    if (!skip) chosen.push(c);
  }

  function collectKeyValueTexts(nodes, startIdx) {
    // KeyValueCard: 제목 텍스트 + 각 Table_A 행의 (label, value) 순서 유지
    const start = nodes[startIdx];
    const end = endIndex(nodes, startIdx);
    const titleTexts = [];
    const pairTexts = [];
    for (let i = startIdx + 1; i < end; i += 1) {
      const n = nodes[i];
      if (isTableRowName(n.name) && (n.type === 'FRAME' || n.type === 'INSTANCE')) {
        const rowTexts = collectTexts(nodes, i);
        for (const t of rowTexts) pairTexts.push(t);
        i = endIndex(nodes, i) - 1;
        continue;
      }
      if (n.type === 'TEXT' && n.text && !isNoise(n.text)) {
        // Table_A 밖에 있는 텍스트 = 카드 제목 후보
        let insideTable = false;
        for (let j = startIdx + 1; j < i; j += 1) {
          if (isTableRowName(nodes[j].name) && nodes[j].depth < n.depth) {
            const te = endIndex(nodes, j);
            if (i < te) { insideTable = true; break; }
          }
        }
        if (!insideTable) titleTexts.push(n.text);
      }
    }
    return titleTexts.concat(pairTexts);
  }

  const sections = [];
  for (const c of chosen) {
    const def = componentMap[c.component] || {};
    let propsTexts;
    if (c.component === 'KeyValueCard') {
      propsTexts = collectKeyValueTexts(nodes, c.index);
    } else if (def.acceptsChildren) {
      const childComps = chosen.filter((x) => x.index > c.index && x.index < c.end);
      propsTexts = [];
      const limit = childComps.length ? childComps[0].index : c.end;
      for (let i = c.index + 1; i < limit; i += 1) {
        const n = nodes[i];
        if (n.type === 'TEXT' && n.text && !isNoise(n.text)) propsTexts.push(n.text);
      }
    } else {
      propsTexts = collectTexts(nodes, c.index);
    }
    const props = assignProps(c.component, propsTexts);
    const mapSlot = String(def.slot || '').toLowerCase();
    let slot = 'content';
    if (/button|action/i.test(c.component) || mapSlot === 'actions') slot = 'actions';
    else if (mapSlot === 'back' || /^BackToList$/i.test(c.component)) slot = 'back';
    else if (mapSlot === 'header' || mapSlot === 'heading' || /^(SectionHeading|Breadcrumb|BreadcrumbGroup|CaseHeader|DetailContentHeader|PageTitle|PageTitleDisplay)/i.test(c.component)) {
      slot = 'header';
    } else if (mapSlot === 'profile' || /^AdvisorProfile$/i.test(c.component)) {
      slot = 'profile';
    }
    sections.push({
      component: c.component,
      path: def.path || '',
      figmaName: c.node.name,
      figmaId: c.node.id,
      props,
      slot,
    });
  }

  if (!sections.length) {
    throw new Error(
      'MCP에서 component-map과 매칭되는 섹션이 없습니다. '
      + 'FRAME 이름(CaseHeader, SectionHeading 등) 또는 map.figmaNames를 확인하세요.'
    );
  }

  const pageName = prepared.pageName || runConfig.pageSlug || 'Figma Design';
  const headerPath = (componentMap.Header && componentMap.Header.path) || '/patterns/gnb.html';
  const footerPath = (componentMap.Footer && componentMap.Footer.path) || '/patterns/footer.html';

  return [{
    json: {
      pageSpec: {
        pageName,
        headerPath,
        footerPath,
        sections,
      },
      sectionCount: sections.length,
      sectionNames: sections.map((s) => s.component),
      preparedMeta: {
        pageName,
        mcpTextLength: mcpText.length,
        sourceFileKey: runConfig.fileKey || prepared.sourceFileKey || '',
        sourceNodeId: runConfig.nodeId || prepared.sourceNodeId || '',
      },
      runConfig,
      pageSlug: runConfig.pageSlug || 'design-page',
      mcpText,
      generationMode: 'pagespec-build',
    },
  }];
};
