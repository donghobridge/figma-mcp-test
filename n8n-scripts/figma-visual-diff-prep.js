/**
 * Visual review helpers for n8n
 * modes:
 *  - prepCapture: 배포 후 /visual-capture 요청 바디
 *  - prepOllama: capture 응답 → Ollama /api/chat body (비전)
 *  - parseGaps: Ollama 응답 → gaps 리포트
 */
const GAPS_PROMPT = `당신은 Yuma 포털(img_text 디자인 시스템) 시안 대비 구현 검수자입니다.

이미지1 = 현재 구현(Playwright 스크린샷)
이미지2 = Figma 시안

목표: 부족한 부분만 구조화 gaps로 도출하세요.
허용 gap type만 사용:
- missing_block: 시안에 있는 블록/섹션이 구현에 없음
- missing_prop: 블록은 있으나 텍스트/파일명/금액 등 내용 누락
- wrong_variant: 같은 역할인데 표현이 다름
- shell_mismatch: GNB/푸터 등 셸이 시안과 다름 (기록만)
- order_mismatch: 섹션 순서가 다름

금지: 새 CSS/portal 클래스, 픽셀 미세조정만, 추측.
JSON만 반환:
{"summary":"한줄 요약","similarityScore":0,"gaps":[{"type":"missing_block","priority":"high","target":"CaseHeader","issue":"...","expected":"...","fixHint":"..."}]}`;

function normalizeGaps(parsed) {
  const gaps = Array.isArray(parsed.gaps) ? parsed.gaps : [];
  const allowed = new Set([
    'missing_block',
    'missing_prop',
    'wrong_variant',
    'shell_mismatch',
    'order_mismatch',
  ]);
  return gaps
    .filter((g) => g && allowed.has(String(g.type || '')))
    .slice(0, 12)
    .map((g) => ({
      type: String(g.type),
      priority: ['high', 'medium', 'low'].includes(g.priority) ? g.priority : 'medium',
      target: String(g.target || 'Other').slice(0, 40),
      issue: String(g.issue || '').slice(0, 240),
      expected: String(g.expected || '').slice(0, 240),
      fixHint: String(g.fixHint || '').slice(0, 240),
    }));
}

function normalizeScore(raw) {
  let score = Number(raw);
  if (!Number.isFinite(score)) score = 0;
  if (score > 0 && score <= 1) score = Math.round(score * 100);
  return Math.max(0, Math.min(100, Math.round(score)));
}

module.exports = function ($input, helpers) {
  const cfg = (helpers && helpers.runConfig) || {};
  const deploy = (helpers && helpers.getJson && helpers.getJson('배포 결과')) || {};
  const input = $input.first().json || {};
  const mode = String(input.mode || cfg.visualDiffMode || 'prepCapture');

  if (mode === 'prepOllama') {
    const capture = input;
    if (!capture.success && !capture.screenshotBase64) {
      return [{
        json: {
          ok: false,
          error: capture.error || 'visual-capture 실패',
          ollamaUrl: '',
          skip: true,
        },
      }];
    }

    const model = String(cfg.visionModel || 'qwen2.5vl:7b').trim();
    const ollamaUrl = String(cfg.ollamaUrl || 'http://127.0.0.1:11434').replace(/\/$/, '');

    const body = {
      model,
      stream: false,
      format: 'json',
      options: { temperature: 0.1 },
      messages: [
        {
          role: 'user',
          content: GAPS_PROMPT,
          images: [capture.screenshotBase64, capture.figmaBase64],
        },
      ],
    };

    return [{
      json: {
        ok: true,
        skip: false,
        ollamaUrl,
        ollamaChatUrl: ollamaUrl + '/api/chat',
        visionModel: model,
        previewUrl: capture.previewUrl || '',
        screenshotPath: capture.screenshotPath || '',
        figmaImagePath: capture.figmaImagePath || '',
        fileKey: capture.fileKey || '',
        nodeId: capture.nodeId || '',
        ollamaBody: body,
      },
    }];
  }

  if (mode === 'parseGaps') {
    const raw = input;
    let content = '';
    if (raw.message && raw.message.content != null) content = String(raw.message.content);
    else if (raw.content != null) content = String(raw.content);
    else if (typeof raw.response === 'string') content = raw.response;
    else if (raw.error) {
      return [{
        json: {
          ok: false,
          error: String(raw.error),
          gaps: [],
          note: 'Ollama 호출 실패',
        },
      }];
    }

    let parsed = {};
    try {
      const cleaned = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      parsed = JSON.parse(cleaned || '{}');
    } catch (error) {
      return [{
        json: {
          ok: false,
          error: 'Ollama JSON 파싱 실패: ' + error.message,
          raw: content.slice(0, 500),
          gaps: [],
        },
      }];
    }

    const gaps = normalizeGaps(parsed);
    let prep = {};
    try { prep = helpers.getJson('Ollama 비전 요청 준비') || {}; } catch (_) {}

    return [{
      json: {
        ok: true,
        previewUrl: prep.previewUrl || deploy.previewUrl || '',
        similarityScore: normalizeScore(parsed.similarityScore),
        summary: String(parsed.summary || ''),
        gapCount: gaps.length,
        highGapCount: gaps.filter((g) => g.priority === 'high').length,
        gaps,
        screenshotPath: prep.screenshotPath || '',
        figmaImagePath: prep.figmaImagePath || '',
        visionModel: prep.visionModel || cfg.visionModel || 'qwen2.5vl:7b',
        patchModelHint: cfg.patchModel || 'qwen3-coder:30b',
        note: 'n8n → Ollama Chat(/api/chat) 비전 비교 리포트',
      },
    }];
  }

  // prepCapture (default)
  const previewUrl = String(
    deploy.previewUrl
    || cfg.previewUrl
    || ((cfg.vercelBaseUrl || 'https://figma-mcp-test-nu.vercel.app').replace(/\/$/, '')
      + '/pages/' + String(cfg.pageSlug || 'design-page') + '.html')
  ).trim();

  return [{
    json: {
      enabled: String(cfg.enableVisualDiff == null ? 'true' : cfg.enableVisualDiff) !== 'false',
      renderServerUrl: String(cfg.renderServerUrl || 'http://127.0.0.1:3001').replace(/\/$/, ''),
      ollamaUrl: String(cfg.ollamaUrl || 'http://127.0.0.1:11434').replace(/\/$/, ''),
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
