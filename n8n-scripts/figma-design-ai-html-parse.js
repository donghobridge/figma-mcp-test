/**
 * AI HTML 추출 + (필요 시) 하드코딩 마크업 → include 수리 + 품질 게이트.
 * Figma 매칭 하드코딩 아님. AI가 잘못 쓴 컴포넌트 마크업만 map path로 되돌림.
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
  const hasHardcode = /class=["'][^"']*(guide-accordion|summary-bar|data-table|key-value-card|section-heading|form-button-group)/i.test(html)
    || /<table[\s>]/i.test(html);

  let repairs = [];
  if (hasHardcode) {
    const repaired = repairToIncludes(html);
    html = repaired.html;
    repairs = repaired.repairs;
    if (repairs.length) {
      warnings.push('AI 하드코딩 마크업을 include로 수리: ' + [...new Set(repairs)].join(', '));
    }
  }

  if (!/data-include-path=/i.test(html)) {
    throw new Error('HTML에 data-include-path가 없습니다. include 형식으로 다시 생성하세요.');
  }

  const stillBanned = [
    /(?:^|[\s"'])class=["'][^"']*\bguide-accordion\b/i,
    /(?:^|[\s"'])class=["'][^"']*\bsummary-bar\b/i,
    /(?:^|[\s"'])class=["'][^"']*\bdata-table\b/i,
    /(?:^|[\s"'])class=["'][^"']*\bkey-value-card\b/i,
  ];
  for (const re of stillBanned) {
    if (re.test(html)) {
      throw new Error(
        '수리 후에도 컴포넌트 마크업이 남았습니다. data-include-path만 사용하세요. 매칭: '
        + String(re)
      );
    }
  }

  if (/TODO|lorem ipsum/i.test(html)) {
    throw new Error('더미 값(TODO/lorem)이 포함되어 있습니다. MCP 원문 실제 값만 쓰세요.');
  }
  if (/정보\s*\(\s*Data\s*\)/i.test(html)) {
    warnings.push('HTML에 "정보(Data)"가 포함됨. 시안 플레이스홀더일 수 있음.');
  }

  const includeCount = (html.match(/data-include-path=/gi) || []).length;
  if (includeCount < 5) {
    throw new Error('include가 너무 적습니다 (' + includeCount + ').');
  }

  const runConfig = meta.runConfig || (helpers && helpers.runConfig) || {};
  const pageName = (meta.preparedMeta && meta.preparedMeta.pageName)
    || runConfig.pageSlug
    || 'Figma Design';

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
    },
  }];
};
