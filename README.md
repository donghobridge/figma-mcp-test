# Yuma Component Library

회사 공통 Design System을 **토큰 → Base Component → Headless → Pattern** 계층으로
조립하는 정적 HTML/CSS 라이브러리입니다. Figma MCP / n8n 파이프라인은 이 저장소의
include 경로와 `import.css`를 기준으로 페이지를 생성·배포합니다.

배포 저장소: [donghobridge/figma-mcp-test](https://github.com/donghobridge/figma-mcp-test)  
미리보기: [figma-mcp-test-nu.vercel.app](https://figma-mcp-test-nu.vercel.app)

## 로컬 실행

루트 절대 경로(`/css/...`, `/patterns/...`)를 쓰므로 **이 폴더를 웹 루트**로 띄웁니다.

```bash
cd yuma-component-library
python3 -m http.server 8080
```

브라우저: `http://localhost:8080`  
패턴 통합 데모: `http://localhost:8080/patterns/demo/site-layout.html`

## 계층 구조

```text
Design Tokens (css/base + css/project)
        ↓
Base Components (components/*)
        ↓
Headless Behavior (headless/*)
        ↓
Web Patterns (patterns/*)
        ↓
Pages (pages/* — 워크플로 산출물, 로컬 골든은 배포 제외)
```

| 경로 | 역할 |
|------|------|
| `import.css` | 공통 CSS 엔트리. base tokens/reset/fonts/components + patterns + project tokens |
| `import.js` | `data-include-path` + `data-prop-*` 런타임 조립 |
| `component-map.json` | Figma 이름 ↔ include 경로/props 레지스트리 (n8n pageSpec용) |
| `css/base/` | 리셋, 폰트, base tokens(light/dark), base components 묶음 CSS |
| `css/project/` | Yuma 프로젝트 토큰 (`tokens.yuma.css`, `tokens.yuma.dark.css`) |
| `components/` | Base 컴포넌트 (`{name}.html` 데모 + `include.html` 조립 조각 + `{name}.css`) |
| `headless/` | 시각과 분리된 동작 레이어 (`behaviors/`, `controllers/`) |
| `patterns/` | GNB·Header·Footer·LNB·Breadcrumb (`*.html` 데모 + `include.html`) |
| `layouts/` | pageSpec 셸 (`page.html`, `detail.html`, `wireframe-shell.html`) |
| `assets/` | 폰트 등 정적 자산 |
| `common.js` | 테마 토글 등 페이지 공통 스크립트 |
| `pages/` | 생성 페이지 출력 위치(배포 시 비움). 로컬 골든/카탈로그는 `.gitignore` |

## 문서

| 문서 | 내용 |
|------|------|
| [디자인시스템_Component_운영매뉴얼_v0.1.md](./디자인시스템_Component_운영매뉴얼_v0.1.md) | 무엇을 Component로 올릴지, Base / Pattern / Project 경계 |
| [디자인시스템_Component_Coding_Convention_v0.1.md](./디자인시스템_Component_Coding_Convention_v0.1.md) | HTML/CSS/Token/상태/접근성 코딩 규칙 |
| [patterns/README.md](./patterns/README.md) | Pattern 목록·데모·Headless 연결 |
| [headless/README.md](./headless/README.md) | Behavior / Controller 계약과 인벤토리 |

## CSS 로드

페이지는 **페이지별 `styles.css`를 두지 않고** 공통 엔트리만 로드합니다.

```html
<link rel="stylesheet" href="/import.css" />
<script defer src="/common.js"></script>
```

`import.css` 로드 순서:

1. `css/base/reset.css` → `fonts.css` → `tokens.css` → `tokens.dark.css` → `components.css`
2. `patterns/patterns.css`
3. `css/project/tokens.yuma.css` → `tokens.yuma.dark.css`

다크 모드는 `html[data-theme="dark"]`로 활성화합니다. (`common.js` 테마 토글)

## Demo vs Include

| 파일 | 용도 |
|------|------|
| `components/{name}/{name}.html` | Variant/State Reference 데모 (전체 HTML 문서) |
| `components/{name}/include.html` | `data-include-path`용 **조각 템플릿** (`{prop}` 자리표시자) |
| `patterns/{name}/*.html` | Pattern 데모 |
| `patterns/{name}/include.html` | Pattern 조립 조각 |

페이지 조립은 **항상 `include.html`** 을 사용합니다. 데모 HTML을 include 하면 안 됩니다.

## Pattern include 경로

| 역할 | include |
|------|---------|
| Site Header | `/patterns/header/include.html` |
| GNB | `/patterns/gnb/include.html` |
| LNB | `/patterns/lnb/include.html` |
| Footer | `/patterns/footer/include.html` |
| Breadcrumb | `/patterns/breadcrumb/include.html` |

호환용 별칭(기존 워크플로): `/patterns/gnb.html`, `/patterns/footer.html` (= include 조각)

네비게이션 동작은 `patterns/demo/site-navigation.js`의 `initSiteNavigation`과
`data-dropdown-trigger` / `data-mobile-nav-trigger` / `data-lnb-disclosure`를 사용합니다.

## Base Component 목록

`accordion` `alert` `badge` `button` `checkbox` `chip` `dialog` `divider` `drawer`
`form-field` `input` `menu` `pagination` `popover` `radio` `selectable-card`
`status` `switch` `table` `tabs` `tag` `textarea` `tooltip`

페이지에서는 `data-include-path="/components/{name}/include.html"`과 `data-prop-*`로 조립합니다.
레지스트리는 루트 `component-map.json`입니다.

## Headless

- `headless/behaviors/` — Escape, Focus Trap, Disclosure, Roving Focus 등 공통 원시 동작
- `headless/controllers/` — Dialog, Drawer, Menu, Mega Menu, Popover, Tabs, Accordion

Headless는 **시각 class를 추가하지 않고** `data-state` / ARIA / native state만 갱신합니다.
상세는 `headless/README.md`를 참고하세요.

## 배포에 포함 / 제외

**포함:** `assets/`, `components/`, `css/`, `patterns/`, `headless/`, `layouts/`,
`lib/`, `import.css`, `import.js`, `component-map.json`, `common.js`, 매뉴얼, README,
`pages/.gitkeep`

**제외:** `wireframe-test/`, `mcp Test/`, `generated-*`, 로컬 `pages/*.html`·카탈로그

워크플로가 생성하는 HTML만 `pages/`에 커밋합니다.


## Figma / AI 조립 원칙

1. 등록된 Base Component·Pattern만 사용하고, 화면 텍스트·이미지는 `data-prop-*`로 전달합니다.
2. GNB / Footer / Header는 Pattern include로만 넣고, 페이지에서 마크업을 새로 쓰지 않습니다.
3. 공통 스타일은 `/import.css`만 사용합니다. 페이지 전용 CSS 파일은 만들지 않습니다.
4. 운영 매뉴얼의 Base vs Pattern vs Project Custom 경계를 지킵니다.
