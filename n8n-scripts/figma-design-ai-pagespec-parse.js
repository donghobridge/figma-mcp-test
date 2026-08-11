/**
 * AI page-spec JSON 응답 → assembler 입력 형태로 정규화.
 */
module.exports = function ($input, helpers) {
  const ai = $input.first().json || {};
  let raw = String(ai.text || ai.output || ai.response || '').trim();

  let meta = {};
  try {
    if (helpers && typeof helpers.getJson === 'function') {
      meta = helpers.getJson('AI page-spec 프롬프트') || {};
    }
  } catch (_) {}
  if (!meta.outputHtmlPath && helpers && helpers.runConfig) {
    meta.runConfig = helpers.runConfig;
  }

  function parseJson(value) {
    let text = String(value || '').trim();
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
    return JSON.parse(text);
  }

  let parsed;
  try {
    parsed = parseJson(raw);
  } catch (error) {
    throw new Error('AI page-spec JSON 파싱 실패: ' + error.message + '\n---\n' + raw.slice(0, 500));
  }

  const components = Array.isArray(parsed.components) ? parsed.components : [];
  if (!components.length) {
    throw new Error('AI page-spec에 components가 없습니다.');
  }

  function normalizeItem(item, index) {
    const content = item && item.content && typeof item.content === 'object' ? item.content : {};
    return {
      component: String(item.component || '').trim(),
      content,
      children: Array.isArray(item.children) ? item.children.map(normalizeItem) : [],
      options: Array.isArray(item.options) ? item.options : [],
      items: Array.isArray(item.items) ? item.items : [],
      actions: Array.isArray(item.actions) ? item.actions : [],
      figmaNode: item.figmaNode || '',
      sourceNodeId: item.sourceNodeId || '',
      order: index + 1,
    };
  }

  const normalized = components
    .map(normalizeItem)
    .filter((item) => item.component);

  if (!normalized.length) {
    throw new Error('유효한 component 항목이 없습니다.');
  }

  const runConfig = meta.runConfig || (helpers && helpers.runConfig) || {};
  const warnings = [
    ...((meta.preparedMeta && meta.preparedMeta.warnings) || []),
    ...(Array.isArray(parsed.warnings) ? parsed.warnings : []),
  ];

  return [{
    json: {
      pageName: parsed.pageName || (meta.preparedMeta && meta.preparedMeta.pageName) || 'Figma Design',
      components: normalized,
      warnings: [...new Set(warnings.map(String))],
      matches: normalized.map((item) => ({
        component: item.component,
        figmaName: item.figmaNode,
        fromAi: true,
      })),
      unmatched: [],
      quality: {
        pass: true,
        missingRequired: [],
        annotationNoise: [],
        checks: [],
        contentComponentCount: normalized.filter((i) => !['Header', 'Footer'].includes(i.component)).length,
      },
      sourceNodeCount: (meta.preparedMeta && meta.preparedMeta.nodeCount) || 0,
      annotationCount: (meta.preparedMeta && meta.preparedMeta.annotationCount) || 0,
      annotatedComponents: [...new Set(normalized.map((i) => i.component))],
      generationMode: 'figma-design-ai-pagespec',
      hierarchy: normalized.map((item) => ({
        component: item.component,
        figmaName: item.figmaNode,
        fromAi: true,
      })),
      needsAiEnrichment: false,
      runConfig,
      outputHtmlPath: meta.outputHtmlPath
        || runConfig.outputHtmlPath
        || '/workspace/yuma-component-library/pages/design_page.html',
      outputReportPath: meta.outputReportPath
        || runConfig.outputReportPath
        || '/workspace/yuma-component-library/generated-figma-design-report.json',
    },
  }];
};
