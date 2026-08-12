/**
 * 배포 후 visual-diff 요청 바디 준비 + (선택) 결과 요약
 * render-server POST /visual-diff 호출용
 */
module.exports = function ($input, helpers) {
  const cfg = (helpers && helpers.runConfig) || {};
  const deploy = (helpers && helpers.getJson && helpers.getJson('배포 결과')) || {};
  const input = $input.first().json || {};

  // 모드: prep | summarize
  const mode = String(input.mode || cfg.visualDiffMode || 'prep');

  if (mode === 'summarize') {
    const report = input;
    const gaps = Array.isArray(report.gaps) ? report.gaps : [];
    return [{
      json: {
        ok: Boolean(report.success),
        previewUrl: report.previewUrl || deploy.previewUrl || '',
        similarityScore: report.similarityScore || 0,
        summary: report.summary || '',
        gapCount: gaps.length,
        highGapCount: report.highGapCount || gaps.filter((g) => g.priority === 'high').length,
        gaps,
        screenshotPath: report.screenshotPath || '',
        figmaImagePath: report.figmaImagePath || '',
        reportPath: report.reportPath || '',
        visionModel: report.visionModel || 'qwen2.5vl:7b',
        patchModelHint: 'qwen3-coder:30b',
        note: report.note || '리포트 전용 (자동 패치 미적용)',
        error: report.error || '',
      },
    }];
  }

  const previewUrl = String(
    deploy.previewUrl
    || cfg.previewUrl
    || ((cfg.vercelBaseUrl || 'https://figma-mcp-test-nu.vercel.app').replace(/\/$/, '')
      + '/pages/' + String(cfg.pageSlug || 'design-page') + '.html')
  ).trim();

  const enabled = String(cfg.enableVisualDiff == null ? 'true' : cfg.enableVisualDiff) !== 'false';

  return [{
    json: {
      enabled,
      renderServerUrl: String(cfg.renderServerUrl || 'http://127.0.0.1:3001').replace(/\/$/, ''),
      previewUrl,
      fileKey: String(cfg.fileKey || '').trim(),
      nodeId: String(cfg.nodeId || '').trim(),
      pageSlug: String(cfg.pageSlug || 'design-page').trim(),
      visionModel: String(cfg.visionModel || 'qwen2.5vl:7b').trim(),
      patchModel: String(cfg.patchModel || 'qwen3-coder:30b').trim(),
      waitMs: Number(cfg.visualDiffWaitMs) || 15000,
      scale: String(cfg.figmaImageScale || '1'),
    },
  }];
};
