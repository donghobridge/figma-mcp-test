/**
 * 조립 HTML 품질 게이트
 * - page-layout 필수
 * - detail/list/form/content 패밀리 셸 검증
 * - strict 모드에서는 본문 component include 0개를 즉시 실패
 */
module.exports = function ($input, helpers) {
  let assembled = {};
  try {
    if (helpers && typeof helpers.getJson === 'function') {
      assembled = helpers.getJson('HTML 조립') || {};
    }
  } catch (_) {}
  if (!assembled.html) assembled = $input.first().json || {};

  const html = String(assembled.html || '');
  if (!html || !/<html[\s>]/i.test(html)) {
    throw new Error('품질 게이트: 조립 HTML이 없습니다.');
  }

  const cfg = (helpers && helpers.runConfig) || assembled.runConfig || {};
  const strict = String(cfg.qualityGateStrict == null ? 'true' : cfg.qualityGateStrict).toLowerCase() !== 'false';

  const errors = [];
  const warnings = Array.isArray(assembled.warnings) ? assembled.warnings.slice() : [];

  if (!/\bpage-layout\b/.test(html)) errors.push('필수 클래스 page-layout 없음');

  if (!/data-include-path="\/patterns\/(gnb|header)(\/include)?\.html"/.test(html)) {
    warnings.push('header/gnb include 없음');
  }
  if (!/data-include-path="\/patterns\/footer(\/include)?\.html"/.test(html)) {
    warnings.push('footer include 없음');
  }
  if (!/data-include-path="\/svg-symbols\.html"/.test(html)) {
    warnings.push('svg-symbols include 없음');
  }

  const componentIncludes = html.match(/data-include-path="\/components\/[^"]+"/g) || [];
  if (!componentIncludes.length) {
    const msg = '본문 component include가 0개입니다. component-map/Figma alias 매칭 실패 가능성이 큽니다.';
    if (strict) errors.push(msg);
    else warnings.push(msg);
  }

  const hasDetail = /detail-view-container|detail-view__content|detail-view--content/.test(html);
  const hasList = /board-container/.test(html);
  const hasForm = /page-layout__page-inner--action|action-box-list|\baction-box\b/.test(html);
  const hasContent = /page-layout__page-inner|page-layout--content/.test(html);

  if (!hasDetail && !hasList && !hasForm && !hasContent) {
    errors.push('페이지 패밀리 셸 없음');
  }

  if (/\blayout-page\b|\blayout-detail\b/.test(html)) {
    errors.push('레거시 셸 layout-page/layout-detail 사용 금지');
  }

  const portalMatches = html.match(/\bportal-[a-z0-9_-]+/gi) || [];
  if (portalMatches.length) {
    const uniq = [...new Set(portalMatches.map((s) => s.toLowerCase()))];
    const msg = `portal-* 클래스 ${uniq.length}종 (${uniq.slice(0, 8).join(', ')})`;
    if (strict) errors.push(msg);
    else warnings.push(msg);
  }

  const layoutMode = assembled.layoutMode
    || (hasForm ? 'form' : hasList ? 'list' : hasDetail ? 'public-detail' : 'content');

  if (errors.length) {
    throw new Error(
      `품질 게이트 실패 (${errors.length}): ${errors.join(' | ')}`
      + (warnings.length ? ` / warnings: ${warnings.join(' | ')}` : '')
    );
  }

  return [{
    json: {
      ...assembled,
      layoutMode,
      warnings,
      qualityGate: {
        ok: true,
        strict,
        componentIncludeCount: componentIncludes.length,
        layoutMode,
        markers: { hasDetail, hasList, hasForm, hasContent },
        errors: [],
        warnings,
      },
    },
  }];
};
