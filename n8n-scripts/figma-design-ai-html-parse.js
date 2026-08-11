/**
 * AI HTML 추출 + 문서 셸 보정 + 품질 게이트.
 * 참고: yuma-component-img_text/pages — 본문은 마크업, include는 공통 셸(svg/gnb/footer).
 */
module.exports = function ($input, helpers) {
  const ai = $input.first().json || {};
  let raw = String(ai.text || ai.output || ai.response || '').trim();

  let meta = {};
  try {
    if (helpers && typeof helpers.getJson === 'function') {
      meta = helpers.getJson('AI HTML 프롬프트') || {};
    }
  } catch (_) {}

  function escapeAttr(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function stripTags(value) {
    return String(value || '')
      .replace(/<svg[\s\S]*?<\/svg>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function includeDiv(path, props) {
    const attrs = [`data-include-path="${escapeAttr(path)}"`];
    for (const [key, val] of Object.entries(props || {})) {
      if (val == null || val === '') continue;
      const kebab = key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
      attrs.push(`data-prop-${kebab}="${escapeAttr(val)}"`);
    }
    return `<div ${attrs.join(' ')}></div>`;
  }

  /** class에 token이 있는 최상위 div 블록을 균형 매칭으로 교체 */
  function replaceClassBlocks(html, classToken, replacer) {
    const openRe = new RegExp(`<div\\b([^>]*class=["'][^"']*${classToken}[^"']*["'][^>]*)>`, 'gi');
    let out = '';
    let last = 0;
    let match;
    while ((match = openRe.exec(html)) !== null) {
      const start = match.index;
      let i = start + match[0].length;
      let depth = 1;
      while (i < html.length && depth > 0) {
        const nextOpen = html.toLowerCase().indexOf('<div', i);
        const nextClose = html.toLowerCase().indexOf('</div>', i);
        if (nextClose < 0) break;
        if (nextOpen >= 0 && nextOpen < nextClose) {
          depth += 1;
          i = nextOpen + 4;
        } else {
          depth -= 1;
          i = nextClose + 6;
        }
      }
      const block = html.slice(start, i);
      out += html.slice(last, start) + replacer(block);
      last = i;
      openRe.lastIndex = i;
    }
    out += html.slice(last);
    return out;
  }

  function repairToIncludes(source) {
    let html = source;
    const repairs = [];

    html = replaceClassBlocks(html, 'section-heading', (block) => {
      const title = (block.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1];
      if (!title) return block;
      repairs.push('SectionHeading');
      return includeDiv('/components/section-heading.html', { title: stripTags(title) });
    });

    html = replaceClassBlocks(html, 'guide-accordion', (block) => {
      const title = (block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) || [])[1];
      const body = (block.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1];
      if (!title) return block;
      repairs.push('GuideAccordion');
      return includeDiv('/components/guide-accordion.html', {
        title: stripTags(title),
        contentHtml: String(body || '').trim(),
      });
    });

    html = replaceClassBlocks(html, 'summary-bar', (block) => {
      // summary-bar__item 은 스킵 (루트 summary-bar 만)
      const openClass = ((block.match(/^<div\b[^>]*class=["']([^"']*)["']/i) || [])[1] || '').split(/\s+/);
      if (!openClass.includes('summary-bar')) return block;
      const labels = [...block.matchAll(/summary-bar__label[^>]*>([\s\S]*?)<\//gi)].map((m) => stripTags(m[1]));
      const values = [...block.matchAll(/summary-bar__value[^>]*>([\s\S]*?)<\//gi)].map((m) => stripTags(m[1]));
      if (!labels.length) return block;
      const props = { variantClass: 'ui-summary-bar--stack' };
      for (let i = 0; i < Math.min(3, labels.length); i += 1) {
        props[`label${i + 1}`] = labels[i];
        props[`value${i + 1}`] = values[i] || '';
      }
      repairs.push('SummaryBar');
      return includeDiv('/components/summary-bar.html', props);
    });

    html = replaceClassBlocks(html, 'key-value-card', (block) => {
      const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
      const rows = [...block.matchAll(
        /data-table__cell--title[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>\s*(?:<p[^>]*>)?([\s\S]*?)(?:<\/p>)?\s*<\/td>/gi
      )];
      if (!rows.length) return block;
      const props = { title: stripTags((titleMatch && titleMatch[1]) || '신청내역') };
      rows.slice(0, 12).forEach((row, i) => {
        props[`label${i + 1}`] = stripTags(row[1]);
        props[`value${i + 1}`] = stripTags(row[2]);
      });
      repairs.push('KeyValueCard');
      return includeDiv('/components/key-value-card.html', props);
    });

    html = html.replace(/<table[^>]*class=["'][^"']*data-table[^"']*["'][^>]*>[\s\S]*?<\/table>/gi, (block) => {
      const rows = [...block.matchAll(
        /data-table__cell--title[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>\s*(?:<p[^>]*>)?([\s\S]*?)(?:<\/p>)?\s*<\/td>/gi
      )];
      if (!rows.length) return block;
      const props = { title: '신청내역' };
      rows.slice(0, 12).forEach((row, i) => {
        props[`label${i + 1}`] = stripTags(row[1]);
        props[`value${i + 1}`] = stripTags(row[2]);
      });
      repairs.push('KeyValueCard');
      return includeDiv('/components/key-value-card.html', props);
    });

    html = replaceClassBlocks(html, 'form-button-group', (block) => {
      const buttons = [...block.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi)].map((m) => stripTags(m[1]));
      if (buttons.length < 2) return block;
      repairs.push('FormButtonGroup');
      return includeDiv('/components/form-button-group.html', {
        secondaryLabel: buttons[0],
        primaryLabel: buttons[1],
      });
    });

    // 장식용 래퍼만 제거 (내용 보존을 위해 열린 태그만)
    html = html.replace(/<div[^>]*class=["'][^"']*page-wrapper[^"']*["'][^>]*>/gi, '');
    html = html.replace(/<div[^>]*class=["'][^"']*form-card[^"']*["'][^>]*>/gi, '');

    return { html, repairs };
  }

  /** include 호스트는 자식이 버려지므로 form-card 래퍼를 풀어 자식을 살린다 */
  function unwrapNestedIncludeHosts(html) {
    function replaceBalancedInclude(source, pathToken, replacer) {
      const openRe = new RegExp(`<div\\b([^>]*data-include-path=["']${pathToken}["'][^>]*)>`, 'gi');
      let out = '';
      let last = 0;
      let match;
      while ((match = openRe.exec(source)) !== null) {
        const start = match.index;
        let i = start + match[0].length;
        let depth = 1;
        while (i < source.length && depth > 0) {
          const nextOpen = source.toLowerCase().indexOf('<div', i);
          const nextClose = source.toLowerCase().indexOf('</div>', i);
          if (nextClose < 0) break;
          if (nextOpen >= 0 && nextOpen < nextClose) {
            depth += 1;
            i = nextOpen + 4;
          } else {
            depth -= 1;
            i = nextClose + 6;
          }
        }
        const attrs = match[1] || '';
        const inner = source.slice(start + match[0].length, i - 6);
        out += source.slice(last, start) + replacer(attrs, inner);
        last = i;
        openRe.lastIndex = i;
      }
      out += source.slice(last);
      return out;
    }

    // form-card: title → section-heading, 자식 include 유지
    html = replaceBalancedInclude(html, '/components/form-card.html', (attrs, inner) => {
      const title = (attrs.match(/data-prop-title=["']([^"']*)["']/) || [])[1];
      const chunks = [];
      if (title) chunks.push(includeDiv('/components/section-heading.html', { title }));
      chunks.push(String(inner || '').trim());
      return chunks.filter(Boolean).join('\n');
    });

    // key-value-card 안에 question-content가 있으면 labelN/valueN으로 합침
    html = replaceBalancedInclude(html, '/components/key-value-card.html', (attrs, inner) => {
      if (!/data-include-path=/.test(inner)) {
        return `<div${attrs}></div>`;
      }
      const props = {};
      const title = (attrs.match(/data-prop-title=["']([^"']*)["']/) || [])[1];
      if (title) props.title = title;
      const children = [...String(inner).matchAll(/<div\b([^>]*data-include-path=["']\/components\/question-content\.html["'][^>]*)>/gi)];
      let idx = 0;
      for (const child of children) {
        idx += 1;
        if (idx > 12) break;
        const a = child[1] || '';
        props[`label${idx}`] = (a.match(/data-prop-label=["']([^"']*)["']/) || [])[1] || '';
        props[`value${idx}`] = (a.match(/data-prop-description=["']([^"']*)["']/) || [])[1]
          || (a.match(/data-prop-value=["']([^"']*)["']/) || [])[1]
          || '';
      }
      return includeDiv('/components/key-value-card.html', props);
    });

    return html;
  }

  function ensureDocumentShell(html, pageName) {
    let out = html;
    if (!/<meta[^>]*charset=/i.test(out)) {
      out = out.replace(/<head([^>]*)>/i, '<head$1>\n  <meta charset="UTF-8">');
    }
    if (!/<meta[^>]*viewport/i.test(out)) {
      out = out.replace(/<head([^>]*)>/i, '<head$1>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    }
    if (!/href=["']\/import\.css["']/i.test(out)) {
      out = out.replace(/<\/head>/i, '  <link rel="stylesheet" href="/import.css">\n</head>');
    }
    if (!/src=["']\/import\.js["']/i.test(out)) {
      out = out.replace(/<\/head>/i, '  <script defer src="/import.js"><\/script>\n</head>');
    }
    if (!/src=["']\/common\.js["']/i.test(out)) {
      out = out.replace(/<\/head>/i, '  <script defer src="/common.js"><\/script>\n</head>');
    }
    if (/<title>[\s\S]*?<\/title>/i.test(out)) {
      out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${pageName}</title>`);
    } else {
      out = out.replace(/<head([^>]*)>/i, `<head$1>\n  <title>${pageName}</title>`);
    }
    if (!/data-include-path=["']\/svg-symbols\.html["']/i.test(out)) {
      out = out.replace(/<body([^>]*)>/i, '<body$1>\n  <div data-include-path="/svg-symbols.html"></div>');
    }
    // layout-page → page-layout (참고 페이지 클래스)
    out = out.replace(/\blayout-page__main\b/g, 'page-layout__page-inner page-layout--content');
    out = out.replace(/\blayout-page\b/g, 'page-layout');
    return out;
  }

  /** Figma 텍스트 토큰/이스케이프 정리 */
  function cleanFigmaTextArtifacts(html) {
    return String(html || '')
      .replace(/\{ts\d+\}/gi, '')
      .replace(/\{\/ts\d+\}/gi, '')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\[/g, '[')
      .replace(/\\\]/g, ']')
      .replace(/\\\//g, '/')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  let html = raw
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const start = html.toLowerCase().indexOf('<!doctype html');
  const altStart = start < 0 ? html.toLowerCase().indexOf('<html') : start;
  const end = html.toLowerCase().lastIndexOf('</html>');
  if (altStart >= 0 && end > altStart) {
    html = html.slice(altStart, end + '</html>'.length).trim();
  }

  if (!/<html[\s>]/i.test(html) || !/<\/html>/i.test(html)) {
    throw new Error('AI 응답에서 HTML 문서를 찾지 못했습니다.\n---\n' + raw.slice(0, 500));
  }

  const warnings = [...((meta.preparedMeta && meta.preparedMeta.warnings) || [])];
  let repairs = [];

  // include-only 강제 제거: 본문 하드코딩 → include 수리는 더 이상 하지 않음
  // (참고: yuma-component-img_text/pages 는 본문 마크업 + gnb/footer include)

  const beforeUnwrap = html;
  html = unwrapNestedIncludeHosts(html);
  if (html !== beforeUnwrap) {
    repairs.push('UnwrapNestedIncludes');
    warnings.push('중첩 include 호스트를 풀어 자식을 살림');
  }

  const runConfigEarly = meta.runConfig || (helpers && helpers.runConfig) || {};
  const pageNameEarly = (meta.preparedMeta && meta.preparedMeta.pageName)
    || runConfigEarly.pageSlug
    || 'Figma Design';
  const beforeShell = html;
  html = ensureDocumentShell(html, pageNameEarly);
  html = cleanFigmaTextArtifacts(html);
  if (html !== beforeShell) {
    repairs.push('DocumentShell');
    warnings.push('import.css/js/common.js/svg-symbols 문서 셸 보정');
  }

  // layout-page 잔존 / 풀폭 본문 구조 차단
  if (/\blayout-page\b/i.test(html)) {
    throw new Error('layout-page 가 남아 있습니다. page-layout + page-layout__page-inner 로 작성하세요.');
  }
  if (!/page-layout__page-inner/i.test(html)) {
    throw new Error(
      'page-layout__page-inner 가 없습니다. 본문이 100% 풀폭으로 나갑니다. '
      + '참고 페이지처럼 page-layout__page-inner(--restr) page-layout--content 를 넣으세요.'
    );
  }

  // 본문 /components include 조립이면 실패 → 참고 페이지 마크업으로 재생성
  const bodyComponentIncludes = (html.match(/data-include-path=["']\/components\/[^"']+["']/gi) || []).length;
  if (bodyComponentIncludes >= 2) {
    throw new Error(
      '본문이 /components include 조립입니다 (' + bodyComponentIncludes + '개). '
      + 'yuma-component-img_text/pages 처럼 page-layout + detail-view 마크업으로 다시 생성하세요.'
    );
  }

  // 셸 include만 필수 (본문 include 강제 금지)
  if (!/data-include-path=["']\/svg-symbols\.html["']/i.test(html)) {
    throw new Error('svg-symbols include가 없습니다.');
  }
  if (!/data-include-path=["'][^"']*\/(patterns\/)?(gnb|header)[^"']*["']/i.test(html)
    && !/data-include-path=["']\/patterns\/gnb\.html["']/i.test(html)) {
    warnings.push('gnb/header include가 없습니다.');
  }
  if (!/page-layout--content|page-layout__page-inner--restr/i.test(html)) {
    warnings.push('page-layout--content / --restr 가 없어 본문 폭이 넓을 수 있습니다.');
  }
  if (!/detail-view|board-container|contents-section|page-inner__inner/i.test(html)) {
    warnings.push('detail-view/board-container 본문 패턴이 약합니다.');
  }

  if (/TODO|lorem ipsum/i.test(html)) {
    throw new Error('더미 값(TODO/lorem)이 포함되어 있습니다. MCP 원문 실제 값만 쓰세요.');
  }
  if (/\(MCP[^)]*\)/i.test(html)) {
    throw new Error('프롬프트 플레이스홀더 "(MCP…)"가 HTML에 남아 있습니다.');
  }
  if (/정보\s*\(\s*Data\s*\)/i.test(html)) {
    warnings.push('HTML에 "정보(Data)"가 포함됨. 시안 플레이스홀더일 수 있음.');
  }

  let mcpText = String(meta.mcpText || '').trim();
  if (!mcpText && helpers && helpers.prepared) {
    mcpText = String(helpers.prepared.mcpText || '').trim();
  }
  if (!mcpText && helpers && typeof helpers.getJson === 'function') {
    try {
      const decoded = helpers.getJson('GitHub map 디코드') || {};
      mcpText = String((decoded.prepared && decoded.prepared.mcpText) || '').trim();
      if (!mcpText) {
        const extracted = helpers.getJson('MCP 텍스트 추출') || {};
        mcpText = String(extracted.mcpText || '').trim();
      }
    } catch (_) {}
  }

  if (mcpText) {
    // 본문 텍스트 grounding (prop 전용 검사 → 본문 텍스트 샘플로 완화)
    const textChunks = [];
    const titleM = html.match(/<(?:h1|h2|h3)[^>]*>([^<]{4,80})<\/(?:h1|h2|h3)>/gi) || [];
    for (const t of titleM) {
      const inner = stripTags(t);
      if (inner.length >= 4) textChunks.push(inner);
    }
    const mcpNorm = mcpText.replace(/\s+/g, '');
    const missing = [];
    for (const v of textChunks.slice(0, 8)) {
      const compact = v.replace(/\s+/g, '');
      if (/^[\d,.\-\/원%]+$/.test(v)) continue;
      if (!mcpNorm.includes(compact) && !mcpText.includes(v)) missing.push(v.slice(0, 40));
    }
    if (missing.length >= 3) {
      warnings.push('본문 제목 일부가 MCP에 없음: ' + missing.slice(0, 3).join(' | '));
    }

    const loanMarkers = ['대출상환', '현재 대출잔액', '상환합계금', '이자계산일수'];
    const loanInHtml = loanMarkers.filter((m) => html.includes(m));
    const loanInMcp = loanMarkers.filter((m) => mcpText.includes(m));
    if (loanInHtml.length >= 2 && loanInMcp.length === 0) {
      throw new Error(
        '대출상환 화면 문구가 HTML에 있으나 MCP 원문에 없습니다. '
        + '실행 입력 nodeId / MCP Client Input을 확인하세요.'
      );
    }
  }

  const includeCount = (html.match(/data-include-path=/gi) || []).length;
  // 셸 3개(svg/gnb/footer)면 충분. 본문 include 과다는 경고만
  if (includeCount < 1) {
    throw new Error('공통 include(svg-symbols 등)가 없습니다.');
  }
  if (includeCount > 12) {
    warnings.push('include가 많습니다 (' + includeCount + '). 본문을 마크업으로 두는 편이 참고 페이지와 맞습니다.');
  }

  const runConfig = runConfigEarly;
  const pageName = pageNameEarly;
  const sourceNodeId = (meta.preparedMeta && meta.preparedMeta.sourceNodeId)
    || runConfig.nodeId
    || '';
  const sourceFileKey = (meta.preparedMeta && meta.preparedMeta.sourceFileKey)
    || runConfig.fileKey
    || '';

  if (sourceNodeId && !/data-source-node-id=/.test(html)) {
    html = html.replace(
      /<body([^>]*)>/i,
      `<body$1 data-source-file-key="${escapeAttr(sourceFileKey)}" data-source-node-id="${escapeAttr(sourceNodeId)}">`
    );
  }
  const mcpHead = mcpText.slice(0, 280).replace(/--+/g, '-');
  if (mcpHead && !/mcp-source:/.test(html)) {
    html = html.replace(
      /<body[^>]*>/i,
      (m) => `${m}\n  <!-- mcp-source nodeId=${sourceNodeId} len=${mcpText.length} head=${mcpHead} -->`
    );
  }

  return [{
    json: {
      pageName,
      html,
      includeCount,
      generationMode: repairs.length ? 'ai-html-repaired' : 'ai-html-direct',
      repairs,
      warnings,
      runConfig,
      pageSlug: runConfig.pageSlug || meta.pageSlug || 'design-page',
      componentCount: includeCount,
      sourceFileKey,
      sourceNodeId,
      mcpTextHead: mcpText.slice(0, 240),
      mcpTextLength: mcpText.length,
    },
  }];
};
