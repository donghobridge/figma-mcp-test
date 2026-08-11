# Yuma Component Library

기존 `yuma-component-img_text`의 정적 HTML 구조, 디자인 토큰, 공통 스타일,
이미지 자산, GNB와 Footer를 유지한 조립형 컴포넌트 PoC입니다.

## 실행

루트 경로 기반 include를 사용하므로 파일을 직접 열지 말고 이 폴더를 웹 루트로 실행합니다.

```bash
cd yuma-component-library
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080`을 엽니다.

## 구조

- `components/`: AI가 선택하고 props를 채우는 재사용 컴포넌트
- `patterns/`: 기존 GNB와 Footer
- `component-map.json`: Figma 이름과 HTML 컴포넌트 매핑용 레지스트리
- `pages/catalog/`: 컴포넌트 조립 예제
- `css/components.css`: 새 컴포넌트 전용 스타일
- `assets/`, `css/`, `lib/`: 기존 프로젝트 자산과 스타일

## Figma 매핑 원칙

Figma 컴포넌트 이름을 `component-map.json`의 키와 일치시킵니다. AI는 등록된
컴포넌트와 variant만 사용하고, 화면별 텍스트와 이미지 값은 `data-prop-*`으로
전달합니다.
