#!/usr/bin/env node
/**
 * pages/generated stubs → mcp Test/*.html (inline + 자족 폴더 복사)
 * 심볼릭 링크 금지 — file:// 더블클릭만으로 열리게 실제 파일 복사
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'mcp Test');

function copyStatic() {
  mkdirSync(outDir, { recursive: true });
  for (const name of ['import.css', 'common.js']) {
    cpSync(path.join(root, name), path.join(outDir, name));
  }
  for (const name of ['css', 'assets', 'lib']) {
    const dest = path.join(outDir, name);
    rmSync(dest, { recursive: true, force: true });
    cpSync(path.join(root, name), dest, { recursive: true });
  }
}

function load(rel) {
  const p = path.join(root, rel.replace(/^\//, ''));
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

function rewriteRootAbsolute(html) {
  return String(html)
    .replace(/\b(src|href|poster)=(["'])\/(?!\/)/gi, '$1=$2')
    .replace(/\burl\(\s*(['"]?)\/(?!\/)/gi, 'url($1');
}

function applyProps(template, content) {
  const data = content || {};
  let html = String(template || '');
  html = html.replace(/\{([A-Za-z0-9_]+)\}/g, (_, key) => {
    if (key === 'variantClass') return data.variantClass || '';
    if (key.endsWith('Html')) return data[key] || '';
    if (key.toLowerCase().includes('href') && !data[key]) return '#';
    const raw = data[key];
    if (raw == null || raw === '') return '';
    return String(raw)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  });
  return html.replace(/\{\s*[A-Za-z0-9_]+\s*\}/g, '');
}

function expandIncludes(html, depth = 0) {
  if (depth > 20) return html;
  let out = rewriteRootAbsolute(html);
  const re = /<div\b([^>]*?)\bdata-include-path=(["'])([^"']+)\2([^>]*)>\s*<\/div>/gi;
  out = out.replace(re, (full, pre, _q, includePath, post) => {
    const rel = String(includePath).replace(/^\//, '');
    const attrs = `${pre} ${post}`;
    const content = {};
    const propRe = /data-prop-([a-z0-9-]+)=(["'])([\s\S]*?)\2/gi;
    let m;
    while ((m = propRe.exec(attrs))) {
      const key = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      content[key] = m[3]
        .replace(/&#10;/g, '\n')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
    }
    const tpl = load(rel);
    if (!tpl) return `<!-- missing include: ${rel} -->`;
    return expandIncludes(applyProps(tpl, content), depth + 1);
  });
  return out;
}

function toClickable(sourceRel, outName) {
  const src = path.join(root, sourceRel);
  if (!existsSync(src)) {
    console.warn('skip missing', sourceRel);
    return;
  }
  let html = readFileSync(src, 'utf8');
  html = html
    .replace(/href="[^"]*import\.css"/g, 'href="import.css"')
    .replace(/src="[^"]*import\.js"/g, '')
    .replace(/src="[^"]*common\.js"/g, 'src="common.js"')
    .replace(/<script[^>]*src="import\.js"[^>]*>\s*<\/script>\s*/gi, '')
    .replace(/<script defer\s*>\s*<\/script>\s*/gi, '');
  html = expandIncludes(html);
  html = html
    .replace(/\b(src|href)=(["'])\.\.\/(assets|css|lib)\//gi, '$1=$2$3/')
    .replace(/\b(src|href)=(["'])\/(assets|css|lib)\//gi, '$1=$2$3/');
  if (!/href="import\.css"/.test(html)) {
    html = html.replace('</title>', '</title>\n  <link rel="stylesheet" href="import.css">');
  }
  if (!/src="common\.js"/.test(html)) {
    html = html.replace('</head>', '  <script defer src="common.js"></script>\n</head>');
  }
  writeFileSync(path.join(outDir, outName), html);
  console.log('wrote', outName, html.length);
}

copyStatic();
if (existsSync(path.join(root, 'pages/test.html'))) toClickable('pages/test.html', 'test.html');
else if (existsSync(path.join(root, 'generated-page.html'))) toClickable('generated-page.html', 'test.html');

if (existsSync(path.join(root, 'generated-page02.html'))) toClickable('generated-page02.html', 'test02.html');
else if (existsSync(path.join(root, 'pages/test02.html'))) toClickable('pages/test02.html', 'test02.html');

if (existsSync(path.join(root, 'generated-page03.html'))) toClickable('generated-page03.html', 'test03.html');
else if (existsSync(path.join(root, 'pages/test03.html'))) toClickable('pages/test03.html', 'test03.html');

if (existsSync(path.join(root, 'generated-figma-wireframe-page.html'))) {
  toClickable('generated-figma-wireframe-page.html', 'test04.html');
}

writeFileSync(
  path.join(outDir, 'README.md'),
  `# mcp Test

서버 없이 Finder에서 HTML을 더블클릭해도 열리도록 **CSS/JS/assets를 폴더 안에 복사**해 둔 결과물입니다.

- \`test.html\`, \`test02.html\`, \`test03.html\`, \`test04.html\` — 컴포넌트 인라인 HTML
- \`import.css\`, \`common.js\`, \`css/\`, \`assets/\`, \`lib/\` — 이 폴더 전용 복사본

\`mcp Test\` 폴더 전체를 다른 곳으로 옮겨도 같이 가져가면 동작합니다.
HTML만 단독으로 복사하면 스타일이 깨집니다.

다시 생성:
\`\`\`bash
cd yuma-component-library
node scripts/bundle-mcp-test.mjs
\`\`\`
`
);
console.log('mcp Test ready (self-contained)');
