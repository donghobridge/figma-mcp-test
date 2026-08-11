/**
 * AI HTML 추출 + 품질 게이트.
 * 하드코딩 컴포넌트 마크업 / 더미값이면 실패시켜 재생성하게 함.
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
  if (!/data-include-path=/i.test(html)) {
    throw new Error('HTML에 data-include-path가 없습니다. include 형식으로 다시 생성하세요.');
  }

  const bannedMarkup = [
    /class=["'][^"']*guide-accordion/i,
    /class=["'][^"']*summary-bar/i,
    /class=["'][^"']*data-table/i,
    /class=["'][^"']*ui-kv-card/i,
    /<table[\s>]/i,
  ];
  for (const re of bannedMarkup) {
    if (re.test(html)) {
      throw new Error(
        '컴포넌트 마크업을 직접 작성했습니다. data-include-path만 사용하세요. 매칭: '
        + String(re)
      );
    }
  }

  const warnings = [...((meta.preparedMeta && meta.preparedMeta.warnings) || [])];
  if (/정보\s*\(\s*Data\s*\)/i.test(html)) {
    warnings.push('HTML에 "정보(Data)"가 포함됨. 시안 플레이스홀더일 수 있음.');
  }
  if (/TODO|lorem ipsum/i.test(html)) {
    throw new Error('더미 값(TODO/lorem)이 포함되어 있습니다. MCP 원문 실제 값만 쓰세요.');
  }

  const includeCount = (html.match(/data-include-path=/gi) || []).length;
  // svg + header + footer + 최소 본문 2
  if (includeCount < 5) {
    throw new Error('include가 너무 적습니다 (' + includeCount + '). SectionHeading/SummaryBar/KeyValueCard/Button 등을 include로 넣으세요.');
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
      generationMode: 'ai-html-direct',
      warnings,
      runConfig,
      pageSlug: runConfig.pageSlug || meta.pageSlug || 'design-page',
      componentCount: includeCount,
    },
  }];
};
