/**
 * 조립 HTML 품질 게이트 (Phase E)
 * - 필수 셸: page-layout
 * - 패밀리 마커: detail-view | board-container | action-box(폼)
 * - 레거시/portal-only 클래스 금지(또는 경고)
 *
 * 실행 입력 qualityGateStrict=false 이면 errors → warnings로 강등
 */
module.exports = function ($input, helpers) {
  let assembled = {};
  try {
    if (helpers && typeof helpers.getJson === 'function') {
      assembled = helpers.getJson('HTML 조립') || {};
    }
  } catch (_) {}
  if (!assembled.html) {
    assembled = $input.first().json || {};
  }

  const html = String(assembled.html || '');
  if (!html || !/<html[\s>]/i.test(html)) {
    throw new Error('품질 게이트: 조립 HTML이 없습니다.');
  }

  const cfg = (helpers && helpers.runConfig) || assembled.runConfig || {};
  const strict = String(cfg.qualityGateStrict == null ? 'true' : cfg.qualityGateStrict).toLowerCase() !== 'false';

  const errors = [];
  const warnings = Array.isArray(assembled.warnings) ? assembled.warnings.slice() : [];

  if (!/\bpage-layout\b/.test(html)) {
    errors.push('필수 클래스 page-layout 없음');
  }
  if (!/data-include-path="\/patterns\/gnb\.html"/.test(html)) {
    warnings.push('gnb include 없음');
  }
  if (!/data-include-path="\/patterns\/footer\.html"/.test(html)) {
    warnings.push('footer include 없음');
  }
  if (!/data-include-path="\/svg-symbols\.html"/.test(html)) {
    warnings.push('svg-symbols include 없음');
  }

  const hasDetail = /detail-view-container|detail-view__content|detail-view--content/.test(html);
  const hasList = /board-container/.test(html);
  const hasForm = /page-layout__page-inner--action|action-box-list|\baction-box\b/.test(html);
  if (!hasDetail && !hasList && !hasForm) {
    errors.push('패밀리 셸 없음 (detail-view / board-container / action-box 중 하나 필요)');
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

  if (!/data-include-path="\/components\//.test(html)) {
    warnings.push('component include가 없음 (빈 페이지 가능)');
  }

  const layoutMode = assembled.layoutMode || (hasForm ? 'form' : hasList ? 'list' : hasDetail ? 'public-detail' : 'content');

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
        layoutMode,
        markers: { hasDetail, hasList, hasForm },
        errors: [],
        warnings,
      },
    },
  }];
};
