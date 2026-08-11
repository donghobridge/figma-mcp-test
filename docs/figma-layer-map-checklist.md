# 새 화면 = Figma 레이어명 = map.figmaNames 체크리스트

목표: n8n이 MCP 트리 순서대로 include를 조립할 때, **프레임 이름이 `component-map.json`과 1:1로 맞는지** 확인한다.

## 1. Figma에서

- [ ] 페이지 루트 아래 **섹션 FRAME/INSTANCE 이름**을 컴포넌트 키(또는 등록된 별칭)로 둔다  
  예: `DetailContentHeader`, `QuestionArea`, `AnswerArea`, `FormCard`, `BoardListItem`
- [ ] `Table_A` / `Table_A_PC` 같은 **행 전용** 이름은 그대로 둔다 (pagespec이 KeyValue/ConfirmTable에 흡수)
- [ ] `wrapper` / `content` / `item` / `box` 같은 범용 이름은 매핑하지 않는다 (스킵)
- [ ] 짧은 모호 별칭 금지: `card`, `heading`, `answer`, `input`, `date`, `BTN`

## 2. component-map.json

- [ ] 키 추가 또는 `figmaNames`에 **정확 매칭** 별칭 등록
- [ ] `path` → `/components/{name}.html` 존재
- [ ] `props` / `textProps` / `propTypes` / `requiredProps` 채움
- [ ] 폼 카드처럼 자식을 품으면 `acceptsChildren: true`
- [ ] JSON 파싱 가능한지 확인 (`node -e "JSON.parse(...)"`)

## 3. 컴포넌트 HTML

- [ ] img_text 실제 페이지 마크업을 복사하고 `{prop}`만 변수화
- [ ] portal-* / layout-page 클래스 쓰지 않음
- [ ] 빈 props여도 깨진 박스가 남지 않게 (CSS `:has(:empty)` 또는 조립 생략)

## 4. 로컬 검증

- [ ] golden include 페이지에서 렌더 확인 (`python3 -m http.server` 등)
- [ ] 샘플 MCP NODES로 `pagespec-build` → `assemble` → `quality-gate` 스모크

## 5. 배포 / n8n

- [ ] `yuma-component-library` → GitHub `figma-mcp-test` 동기화 (`components/`, `component-map.json`, `n8n-scripts/`)
- [ ] 워크플로 재import 후 **MCP Client는 UI에서만** 연결
- [ ] `pageSlug` / `fileKey` / `nodeId`로 실행 → Vercel `pages/{slug}.html`

## 품질 게이트가 막는 것

| 검사 | 실패 시 |
|------|---------|
| `page-layout` 없음 | throw |
| detail/list/form 셸 마커 없음 | throw |
| `layout-page` / `layout-detail` | throw |
| `portal-*` 클래스 (strict) | throw |
| gnb/footer/svg 누락 | warning만 |

`실행 입력.qualityGateStrict=false` 이면 `portal-*`는 warning으로 강등.
