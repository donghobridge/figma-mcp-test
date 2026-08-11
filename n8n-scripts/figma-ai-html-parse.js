/**
 * AI HTML 응답에서 문서만 추출.
 */
module.exports = function ($input, helpers) {
  const pageSpec = (helpers && (helpers.pageSpec || helpers.aiPromptMeta)) || {};
  const ai = $input.first().json || {};
  let raw = String(ai.text || ai.output || ai.response || '').trim();

  // 이전 노드에서 pageSpec을 못 가져오면 prompt 노드 결과 사용
  let meta = pageSpec;
  try {
    // helpers.pageSpec may be empty; try reading from AI prompt builder via getJson if provided
    if (!meta.outputHtmlPath && helpers && typeof helpers.getJson === 'function') {
      meta = helpers.getJson('AI HTML 프롬프트') || meta;
    }
  } catch (_) {}

  raw = raw
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const start = raw.search(/<!DOCTYPE html>|<html[\s>]/i);
  const end = raw.toLowerCase().lastIndexOf('</html>');
  let html = raw;
  if (start >= 0 && end > start) {
    html = raw.slice(start, end + '</html>'.length);
  }

  if (!/data-include-path=/i.test(html)) {
    throw new Error('AI HTML에 data-include-path가 없습니다. 조립 실패로 판단합니다.');
  }
  if (!/<html[\s>]/i.test(html)) {
    throw new Error('AI 응답이 HTML 문서가 아닙니다.');
  }

  // prompt 메타가 응답에 섞여 있으면 pageSpec은 helpers/ai prompt 노드에서
  const outputHtmlPath = meta.outputHtmlPath
    || (helpers && helpers.runConfig && helpers.runConfig.outputHtmlPath)
    || '/workspace/yuma-component-library/pages/new_page.html';
  const outputReportPath = meta.outputReportPath
    || (helpers && helpers.runConfig && helpers.runConfig.outputReportPath)
    || '/workspace/yuma-component-library/generated-figma-wireframe-report.json';

  return [{
    json: {
      pageName: meta.pageName || 'AI HTML Page',
      generationMode: (meta.generationMode || 'figma-tagged') + '+ai-html-assembly',
      assemblyMode: 'ai',
      componentCount: Array.isArray(meta.components) ? meta.components.length : 0,
      warnings: meta.warnings || [],
      html,
      outputHtmlPath,
      outputReportPath,
      runConfig: meta.runConfig || helpers.runConfig || {},
      components: meta.components || [],
      annotatedComponents: meta.annotatedComponents || [],
      annotationCount: meta.annotationCount || 0,
      hierarchy: meta.hierarchy || [],
      needsAiEnrichment: false,
    },
  }];
};
