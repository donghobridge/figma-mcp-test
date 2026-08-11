#!/usr/bin/env node
/**
 * design_page / design_page02 를 wireframe-test 폴더로 패키징.
 * - data-include-path 를 정적 HTML로 전개 (다른 PC에서도 동일 렌더)
 * - CSS/폰트/이미지/common.js 상대경로로 복사
 */
const fs = require('fs');
const path = require('path');

const libRoot = path.resolve(__dirname, '../../yuma-component-library');
const outRoot = path.join(libRoot, 'wireframe-test');

const pages = [
  { src: 'pages/design_page.html', out: 'design_page.html', title: '와이어프레임 테스트 — 이벤트 참여' },
  { src: 'pages/design_page02.html', out: 'design_page02.html', title: '와이어프레임 테스트 — 상담 상세' },
];

function readLib(rel) {
  const clean = String(rel || '').replace(/^\//, '');
  const full = path.join(libRoot, clean);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

function datasetKeyToProp(attrName) {
  // data-prop-notice-title → noticeTitle (HTML dataset 규칙과 동일)
  const raw = attrName.replace(/^data-prop-/i, '');
  return raw.replace(/-([a-z])/gi, (_, c) => c.toUpperCase());
}

function datasetKeyToClass(attrName) {
  const raw = attrName.replace(/^data-class-/i, '');
  return raw.replace(/-([a-z])/gi, (_, c) => c.toUpperCase());
}

function fillTemplate(template, attrs) {
  let html = template;
  for (const [name, value] of Object.entries(attrs.props || {})) {
    html = html.replace(new RegExp(`\\{\\s*${name}\\s*\\}`, 'g'), value);
  }
  for (const [name, value] of Object.entries(attrs.classes || {})) {
    html = html.replace(new RegExp(`\\{\\s*${name}Class\\s*\\}`, 'g'), value);
  }
  html = html.replace(/\{\s*\w+Class\s*\}/g, '');
  html = html.replace(/\{\s*[A-Za-z][\w]*\s*\}/g, '');
  return html;
}

function parseIncludeTag(tag) {
  const pathMatch = tag.match(/data-include-path="([^"]*)"/i);
  if (!pathMatch) return null;
  const includePath = pathMatch[1];
  const props = {};
  const classes = {};
  const propRe = /data-prop-([a-z0-9-]+)="([^"]*)"/gi;
  let m;
  while ((m = propRe.exec(tag)) !== null) {
    props[datasetKeyToProp(`data-prop-${m[1]}`)] = m[2]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"');
  }
  const classRe = /data-class-([a-z0-9-]+)="([^"]*)"/gi;
  while ((m = classRe.exec(tag)) !== null) {
    classes[datasetKeyToClass(`data-class-${m[1]}`)] = m[2];
  }
  return { includePath, props, classes };
}

function expandIncludes(html, depth = 0) {
  if (depth > 20) return html;
  const re = /<div\b[^>]*\bdata-include-path="[^"]*"[^>]*><\/div>/gi;
  return html.replace(re, (tag) => {
    const parsed = parseIncludeTag(tag);
    if (!parsed) return tag;
    const tpl = readLib(parsed.includePath);
    if (tpl == null) {
      return `<!-- missing include: ${parsed.includePath} -->`;
    }
    const filled = fillTemplate(tpl, parsed);
    return expandIncludes(filled, depth + 1);
  });
}

function rewriteAssetPaths(html) {
  return html
    .replace(/href="\/import\.css"/g, 'href="./import.css"')
    .replace(/src="\/import\.js"/g, 'src="./import.js"')
    .replace(/src="\/common\.js"/g, 'src="./common.js"')
    .replace(/(src|href)="\/(assets\/[^"]+)"/g, '$1="./$2"')
    .replace(/(src|href)="\/(lib\/[^"]+)"/g, '$1="./$2"')
    .replace(/url\(\s*['"]?\/(assets\/)/g, 'url("./$1');
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    // css/css, assets/assets 같은 순환 심볼릭 링크 스킵
    if (entry.isSymbolicLink()) continue;
    let stat;
    try {
      stat = fs.lstatSync(from);
    } catch (_) {
      continue;
    }
    if (stat.isSymbolicLink() || stat.isSocket() || stat.isFIFO()) continue;
    if (entry.isDirectory()) copyDir(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

function copyFile(rel, destRel = rel) {
  const from = path.join(libRoot, rel);
  const to = path.join(outRoot, destRel);
  if (!fs.existsSync(from)) {
    console.warn('skip missing', rel);
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function main() {
  fs.rmSync(outRoot, { recursive: true, force: true });
  fs.mkdirSync(outRoot, { recursive: true });

  // styles & runtime
  copyFile('import.css');
  copyFile('import.js');
  copyFile('common.js');
  copyDir(path.join(libRoot, 'css'), path.join(outRoot, 'css'));
  copyDir(path.join(libRoot, 'assets'), path.join(outRoot, 'assets'));
  copyDir(path.join(libRoot, 'lib'), path.join(outRoot, 'lib'));

  for (const page of pages) {
    const raw = readLib(page.src);
    if (!raw) throw new Error(`missing ${page.src}`);
    let html = expandIncludes(raw);
    html = rewriteAssetPaths(html);
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${page.title}</title>`);
    // include 이미 전개됨 — import.js 없어도 마크업 동일. common.js는 UI 동작용으로 유지
    fs.writeFileSync(path.join(outRoot, page.out), html, 'utf8');
    console.log('wrote', page.out);
  }

  const readme = `# Wireframe Test (portable)

다른 컴퓨터에서도 같은 화면을 보기 위한 정적 복사본입니다.
\`data-include-path\` 는 미리 전개되어 있습니다.

## 페이지
- \`design_page.html\` — 이벤트 참여(폼)
- \`design_page02.html\` — 상담 상세

## 여는 방법
폴더에서 HTTP 서버로 여는 것을 권장합니다.

\`\`\`bash
cd wireframe-test
python3 -m http.server 8090
\`\`\`

브라우저: http://127.0.0.1:8090/design_page.html  
또는 http://127.0.0.1:8090/design_page02.html

> \`file://\` 로 직접 열어도 대부분 보이지만, 일부 브라우저/폰트 정책에 따라 차이가 날 수 있습니다.
`;
  fs.writeFileSync(path.join(outRoot, 'README.md'), readme, 'utf8');

  const index = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Wireframe Test</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 48px auto; padding: 0 16px; }
    a { display: block; margin: 12px 0; font-size: 18px; }
  </style>
</head>
<body>
  <h1>Wireframe Test</h1>
  <a href="./design_page.html">design_page.html — 이벤트 참여</a>
  <a href="./design_page02.html">design_page02.html — 상담 상세</a>
</body>
</html>`;
  fs.writeFileSync(path.join(outRoot, 'index.html'), index, 'utf8');

  console.log('done →', outRoot);
}

main();
