# 디자인 시스템 Component Coding Convention

## 1. 목적

본 문서는 회사 공통 Design System에 포함되는 Component를 구현할 때 사용하는 **HTML, CSS, Token, 상태, 접근성 및 파일 구성 규칙​**을 정의한다.

이 문서의 목적은 모든 개발자가 동일한 형태의 코드를 작성하게 만드는 것 자체가 아니다.

궁극적인 목적은 다음과 같다.

> Component를 프로젝트마다 다시 설계하거나 다시 구현하지 않고,  
> 동일한 구조와 API를 여러 프로젝트에서 반복 사용할 수 있도록 한다.

또한 향후 AI가 디자인 산출물을 분석하여 사내 Design System Component를 선택하고 조합할 때에도 Component의 구조와 역할을 명확하게 식별할 수 있도록 한다.

---

# 2. 적용 범위

본 Convention은 다음 영역에 적용한다.

```text
Base Components
Project Components
Component HTML
Component CSS
Component Token
Responsive Style
Theme Style
Headless Behavior와 연결되는 상태 표현
```

다음 영역은 별도 규칙으로 관리할 수 있다.

```text
JavaScript Architecture
Headless UI Implementation
Build System
Application Business Logic
Framework별 Component Wrapper
```

---

# 3. 기본 설계 원칙

모든 Base Component는 다음 원칙을 따른다.

```text
Semantic HTML
+
Predictable Class API
+
Token-based Styling
+
Accessible State
+
Project-independent Structure
```

Component는 특정 프로젝트의 디자인을 완성하는 코드가 아니라:

> **여러 프로젝트가 공통으로 사용하는 구조와 디자인 인터페이스**

로 작성한다.

---

# 4. Base와 Project의 책임 분리

Component 작성 시 항상 다음 계층을 구분한다.

```text
Base Design System
├ Design Tokens
├ Base Components
└ Headless Behavior

Project
├ Project Tokens
├ Project Components
└ Project Custom UI
```

Base Component에는 특정 프로젝트의 브랜드, 서비스명, 콘텐츠 의미를 넣지 않는다.

### 금지 예

```css
.button--yellow {}
.button--yuma {}
.card--tax {}
.badge--membership {}
```

### 권장 예

```css
.button--primary {}
.button--secondary {}
.badge--success {}
```

실제 컬러는 Token이 결정한다.

---

# 5. Component 파일 구조

공통 Component는 Component 단위로 디렉터리를 구성한다.

```text
components/
├ button/
│  ├ button.html
│  └ button.css
│
├ input/
│  ├ input.html
│  └ input.css
│
└ checkbox/
   ├ checkbox.html
   └ checkbox.css
```

초기 단계에서는 Component별 HTML과 CSS를 기본 단위로 사용한다.

공통 Component CSS의 Entry Point는 별도로 관리한다.

```css
/* css/base/components.css */

@import url('/components/button/button.css');
@import url('/components/input/input.css');
@import url('/components/checkbox/checkbox.css');
```

Component가 추가될 때 프로젝트별 CSS에서 직접 import하지 않고 공통 Entry Point를 통해 관리한다.

---

# 6. HTML 기본 원칙

## Semantic HTML 우선

Component의 역할과 동일한 Native HTML Element가 있다면 우선 사용한다.

### Button

```html
<button type="button" class="button">
  확인
</button>
```

### Link

```html
<a href="/guide" class="button">
  자세히 보기
</a>
```

페이지 이동은 `<a>`, Action 실행은 `<button>`을 기본으로 한다.

다음과 같이 의미 없는 Element를 Button으로 사용하지 않는다.

```html
<div class="button">확인</div>
<span class="button">확인</span>
```

---

# 7. Component Root Class

모든 Component는 하나의 명확한 Root Class를 가진다.

예:

```text
.button
.input
.checkbox
.modal
.tabs
```

Root Class 하나만 보고도 어떤 Component인지 식별할 수 있어야 한다.

과도하게 축약된 이름은 지양한다.

### 지양

```text
.btn
.inp
.chk
```

### 권장

```text
.button
.input
.checkbox
```

가독성과 AI 식별 가능성을 고려하여 가능하면 의미가 명확한 전체 단어를 사용한다.

---

# 8. Class Naming 기본 규칙

Base Component Class는 다음 구조를 기본으로 한다.

```text
.component
.component--variant
.component--size
.component__element
```

예:

```html
<button class="button button--primary button--large">
  <span class="button__icon"></span>
  <span class="button__label">확인</span>
</button>
```

각 의미는 다음과 같다.

```text
.button
→ Component

.button--primary
→ Variant

.button--large
→ Size

.button__icon
→ 내부 Element

.button__label
→ 내부 Element
```

BEM 전체 규칙을 엄격하게 도입하기 위한 목적은 아니며, **Component / Modifier / 내부 Element를 코드에서 명확하게 구분하기 위한 규칙**으로 사용한다.

---

# 9. Variant Naming

Variant는 컬러나 형태가 아니라 **역할과 우선순위**를 기준으로 명명한다.

### 권장

```text
primary
secondary
tertiary
success
warning
error
```

### 지양

```text
yellow
black
white
rounded
blue
```

예:

```html
<button class="button button--primary">
```

Project가 변경되어 Primary Button의 컬러가 Yellow에서 Blue로 바뀌어도 Class는 변경되지 않는다.

```text
button--primary

YUMA
→ Yellow

Project B
→ Blue
```

실제 표현은 Token이 담당한다.

---

# 10. Size Naming

Component Size는 가능한 일관된 Scale을 사용한다.

기본 Naming 후보:

```text
xsmall
small
medium
large
xlarge
```

Class에서는 가독성을 위해 전체 명칭을 권장한다.

```html
<button class="button button--medium">
```

Token에서는 필요에 따라 축약형을 사용할 수 있다.

```css
--button-height-xs
--button-height-sm
--button-height-md
--button-height-lg
--button-height-xl
```

HTML API와 Token API가 반드시 같은 표기법을 사용할 필요는 없지만 프로젝트 전체에서 일관성을 유지한다.

Component에 존재하지 않는 Size를 억지로 추가하지 않는다.

예를 들어 Button에 `xlarge`가 필요하지 않다면 정의하지 않는다.

---

# 11. State Naming

Native HTML/CSS State로 표현 가능한 상태는 Class로 만들지 않는다.

### 지양

```html
<button class="button is-hover">
<button class="button is-disabled">
<button class="button is-active">
```

### 권장

```css
.button:hover {}

.button:focus-visible {}

.button:active {}

.button:disabled {}
```

Native State를 우선 사용한다.

---

# 12. JavaScript State

Native Selector로 표현하기 어려운 상태이며 Headless Behavior가 관리하는 상태라면 ARIA 또는 `data-*`를 사용한다.

예:

```html
<button
  class="accordion__trigger"
  aria-expanded="true"
>
```

CSS:

```css
.accordion__trigger[aria-expanded="true"] {
  /* opened */
}
```

또는:

```html
<div
  class="dropdown"
  data-state="open"
>
```

```css
.dropdown[data-state="open"] {
  /* opened */
}
```

---

# 13. 상태 표현 우선순위

상태 표현 방법은 다음 순서를 기본으로 한다.

```text
1. Native HTML State
2. ARIA State
3. data-* State
4. State Class
```

예:

```text
disabled
→ :disabled

expanded
→ aria-expanded

selected
→ aria-selected

Headless internal state
→ data-state
```

단순히 CSS 작성이 편하다는 이유로 모든 상태를 `.is-active` 등의 Class로 관리하지 않는다.

---

# 14. ARIA와 data-*의 역할

ARIA Attribute는 접근성 의미가 실제로 존재하는 경우 사용한다.

예:

```html
aria-expanded
aria-selected
aria-pressed
aria-disabled
aria-current
```

단순히 CSS Hook이 필요하다는 이유로 잘못된 ARIA Attribute를 사용하지 않는다.

접근성 의미가 없는 내부 UI 상태라면:

```html
data-state="open"
data-state="closed"
```

와 같이 `data-*`를 사용할 수 있다.

---

# 15. CSS Selector 원칙

Selector는 최대한 단순하게 유지한다.

### 권장

```css
.button {}

.button--primary {}

.button__icon {}

.button:disabled {}
```

### 지양

```css
.content .form-area .button-wrap button.button {}

.page .section > div > button {}

.button.button-primary span.icon svg path {}
```

DOM 구조에 과도하게 의존하는 Selector는 Component 재사용성을 낮춘다.

---

# 16. Selector Specificity

Base Component는 낮은 Specificity를 유지한다.

다음 방식은 가능한 피한다.

```text
!important
ID selector
과도한 selector nesting
DOM hierarchy 의존
```

특별한 이유 없이:

```css
.button {
  color: ... !important;
}
```

를 사용하지 않는다.

Project Layer에서 Base를 합리적으로 override할 수 있어야 한다.

---

# 17. Component 내부 Element

Component 내부에서 의미 있는 Layout Element가 필요하면 Element Class를 사용한다.

예:

```html
<button class="button button--primary">
  <span class="button__icon"></span>
  <span class="button__label">저장</span>
</button>
```

다음처럼 태그 구조 자체에 CSS가 종속되지 않도록 한다.

### 지양

```css
.button > span:first-child {}
.button span + span {}
```

### 권장

```css
.button__icon {}
.button__label {}
```

단, 의미 없는 Element마다 Class를 부여하지 않는다.

---

# 18. Component Token Naming

Component Token은 가능한 다음 형태를 사용한다.

```text
--{component}-{variant}-{property}-{state}
```

예:

```css
--button-primary-bg
--button-primary-bg-hover
--button-primary-text
--button-primary-text-disabled
```

Size 관련 Token은 다음 형식을 사용한다.

```text
--{component}-{property}-{size}
```

예:

```css
--button-height-sm
--button-height-md
--button-height-lg

--button-padding-x-sm
--button-padding-x-md
--button-padding-x-lg

--button-radius-sm
--button-radius-md
--button-radius-lg
```

---

# 19. Token 계층

Token은 다음 구조를 기본으로 한다.

```text
Primitive
    ↓
Semantic
    ↓
Component
```

예:

```css
/* Primitive */
--color-neutral-800: #212427;


/* Semantic */
--surface-action-strong:
  var(--color-neutral-800);


/* Component */
--button-primary-bg:
  var(--surface-action-strong);
```

다만 의미 없이 Alias 단계만 증가시키지 않는다.

---

# 20. CSS에서 Token을 사용하는 기준

프로젝트에 따라 변경될 가능성이 높은 **디자인 값**은 Token 사용을 우선한다.

주요 대상:

```text
color
background
font
font-size
font-weight
line-height
letter-spacing

width / height
padding
gap

radius
border
shadow

opacity
icon size

focus style
hover style
pressed style
disabled style

transition 관련 디자인 값
```

---

# 21. Token화하지 않는 값

구조를 표현하는 CSS까지 Token화하지 않는다.

### 일반적으로 Token화하지 않는 예

```css
display: inline-flex;
align-items: center;
justify-content: center;

position: relative;

cursor: pointer;

box-sizing: border-box;
```

### 지양

```css
--button-display: inline-flex;
--button-cursor: pointer;
--button-position: relative;
```

Token은 CSS Property 저장소가 아니다.

> Token은 Design Decision을 변경하기 위한 Interface이다.

---

# 22. 0 / none / transparent Token

현재 Base 디자인에서 사용하지 않더라도 프로젝트별로 변경될 가능성이 높은 디자인 옵션은 기본 Token으로 제공할 수 있다.

예:

```css
--button-border-width: 0;
--button-border-color: transparent;
--button-shadow: none;
```

Base CSS:

```css
.button {
  border-width: var(--button-border-width);
  border-color: var(--button-border-color);
  box-shadow: var(--button-shadow);
}
```

Project에서는:

```css
--button-border-width: 1px;
--button-border-color: var(--color-primary-500);
```

처럼 CSS 자체를 수정하지 않고 표현할 수 있다.

단 미래의 모든 가능성을 예상하여 Token을 무한정 만들지 않는다.

---

# 23. Project Token Override

Project에서 Base Component의 디자인을 변경할 때 Component CSS를 복사하거나 직접 수정하지 않는다.

### Base

```css
--button-radius-md: var(--radius-12);
```

### Project

```css
--button-radius-md: var(--radius-16);
```

Component CSS:

```css
.button--medium {
  border-radius: var(--button-radius-md);
}
```

이 방식으로 프로젝트 Look & Feel을 변경한다.

---

# 24. Project CSS에서 Base Selector Override

Token 변경만으로 해결할 수 없는 경우에 한하여 Project Component Style을 추가한다.

예:

```text
Base Component
+
Project Component Override
```

이 경우에도 기존 Base Selector를 강제로 무력화하는 방식보다는 별도의 Project Modifier 또는 Wrapper 정책을 검토한다.

Project에서 발생한 예외를 Base CSS에 즉시 추가하지 않는다.

---

# 25. Dark Theme

Theme Token은 다음 Layer로 관리한다.

```text
tokens.css
→ Base Light

tokens.dark.css
→ Base Dark

tokens.yuma.css
→ Project Light

tokens.yuma.dark.css
→ Project Dark
```

Base Component CSS에서는 Theme를 직접 판단하지 않는다.

### 지양

```css
@media (prefers-color-scheme: dark) {
  .button {
    background: #fff;
  }
}
```

### 권장

```css
.button {
  background: var(--button-primary-bg);
}
```

Theme 변경은 Token Layer가 담당한다.

---

# 26. Fixed Token

Theme에 관계없이 동일한 값을 유지해야 하는 경우 `fixed` Token을 사용할 수 있다.

예:

```css
--text-default
--text-default-fixed
```

Dark Theme에서는:

```css
--text-default: ...;
```

만 변경하고:

```css
--text-default-fixed
```

는 그대로 유지한다.

`fixed`는 편의상 Theme override를 피하기 위한 값이 아니라, **실제로 Theme 변화의 영향을 받아서는 안 되는 경우에만 사용한다.**

---

# 27. Responsive 기본 원칙

시스템은 Mobile First를 기본으로 한다.

현재 Breakpoint 기준:

```text
Mobile
→ default

Tablet
→ 768px 이상

PC
→ 1024px 이상
```

기본 Style을 먼저 선언하고 필요한 경우에만 상위 Breakpoint에서 Override한다.

```css
.button {
  /* mobile */
}

@media (min-width: 768px) {
  .button {
    /* tablet */
  }
}

@media (min-width: 1024px) {
  .button {
    /* pc */
  }
}
```

---

# 28. Responsive 값은 가능한 Token에서 제어

Breakpoint에 따라 단순 디자인 값만 변경된다면 Component CSS 자체보다 Token Override를 우선한다.

예:

```css
:root {
  --button-height-lg: var(--size-52);
}

@media (min-width: 768px) {
  :root {
    --button-height-lg: var(--size-54);
  }
}

@media (min-width: 1024px) {
  :root {
    --button-height-lg: var(--size-56);
  }
}
```

Component:

```css
.button--large {
  min-height: var(--button-height-lg);
}
```

Button CSS는 Breakpoint를 알 필요가 없다.

이 형태를 우선한다.

---

# 29. Component 자체 구조가 바뀌는 Responsive

모든 Responsive 처리를 Token으로 해결하려 하지 않는다.

예를 들어 모바일에서는 Vertical Layout이고 Desktop에서는 Horizontal Layout이어야 한다면 이는 구조적 CSS이므로 Component CSS의 Media Query에서 처리할 수 있다.

즉:

```text
디자인 값 변화
→ Token

Layout Behavior 변화
→ Component CSS
```

를 기본 판단 기준으로 한다.

---

# 30. Button HTML 예시

Button의 기본 작성 방식 예시는 다음과 같다.

```html
<button
  type="button"
  class="button button--primary button--medium"
>
  <span class="button__label">
    확인
  </span>
</button>
```

Icon 포함:

```html
<button
  type="button"
  class="button button--primary button--medium"
>
  <span class="button__icon" aria-hidden="true">
    <!-- icon -->
  </span>

  <span class="button__label">
    다운로드
  </span>
</button>
```

Icon Only:

```html
<button
  type="button"
  class="button button--tertiary button--medium button--icon-only"
  aria-label="메뉴 열기"
>
  <span class="button__icon" aria-hidden="true">
    <!-- icon -->
  </span>
</button>
```

---

# 31. Icon 원칙

Base Component는 특정 Icon Asset에 종속되지 않는다.

Component CSS가 담당하는 것은 다음과 같다.

```text
icon size
icon position
text/icon gap
icon-only layout
```

실제 Icon Graphic은 별도 Icon System 또는 프로젝트 Asset에서 제공할 수 있다.

---

# 32. SVG Styling

가능한 경우 SVG가 현재 Color를 상속할 수 있도록 한다.

예:

```css
.button {
  color: var(--button-primary-text);
}

.button__icon {
  color: currentColor;
}
```

SVG가 지원한다면:

```svg
fill="currentColor"
```

또는:

```svg
stroke="currentColor"
```

를 활용하여 Button State마다 SVG 내부 Path Color를 별도로 override하는 구조를 피한다.

---

# 33. Accessibility 기본 원칙

Base Component는 기본적으로 접근 가능한 상태를 제공해야 한다.

반드시 검토:

```text
keyboard
focus-visible
disabled
accessible name
semantic HTML
ARIA state
hit area
```

---

# 34. Focus

다음 패턴은 금지한다.

```css
.button:focus {
  outline: none;
}
```

Focus Outline을 제거한다면 반드시 대체 Focus Indicator가 있어야 한다.

예:

```css
.button:focus-visible {
  outline: var(--button-focus-width) solid
    var(--button-focus-color);

  outline-offset: var(--button-focus-offset);
}
```

Focus 디자인 값 역시 프로젝트별 변경 가능성이 있다면 Token으로 관리한다.

---

# 35. Disabled

Native `button`에서는 가능한 `disabled` Attribute를 사용한다.

```html
<button disabled>
```

CSS:

```css
.button:disabled {
  cursor: not-allowed;
}
```

단 Disabled 상태가 단순히 색상 차이만으로 표현되지 않는지 확인한다.

---

# 36. aria-disabled

Native Disabled를 사용할 수 없는 요소 또는 실제 요구사항이 있는 경우 `aria-disabled="true"`를 사용할 수 있다.

```html
<a
  class="button"
  aria-disabled="true"
>
```

다만 `aria-disabled`는 실제 Interaction을 자동으로 막지 않는다.

동작 제어는 Headless 또는 Application Logic의 책임이다.

CSS는 상태 표현만 담당한다.

---

# 37. Icon-only Component

텍스트가 없는 Button은 반드시 Accessible Name을 제공해야 한다.

예:

```html
<button
  class="button button--icon-only"
  aria-label="검색"
>
```

아이콘에 `aria-hidden="true"`를 적용할 수 있다.

---

# 38. CSS Property 선언 순서

CSS Property는 엄격한 자동 정렬 규칙까지 강제하지 않더라도, Component 내부에서 다음 흐름을 권장한다.

```text
1. Layout / Display
2. Position
3. Size
4. Spacing
5. Typography
6. Visual
7. Interaction
8. Animation
```

예:

```css
.button {
  /* layout */
  display: inline-flex;
  align-items: center;
  justify-content: center;

  /* size */
  min-height: var(--button-height-md);

  /* spacing */
  padding-inline: var(--button-padding-x-md);
  gap: var(--button-gap);

  /* typography */
  font-size: var(--button-font-size-md);
  font-weight: var(--button-font-weight);

  /* visual */
  color: var(--button-primary-text);
  background: var(--button-primary-bg);
  border-radius: var(--button-radius-md);

  /* interaction */
  cursor: pointer;

  /* animation */
  transition: ...;
}
```

---

# 39. Shorthand 사용

Shorthand 사용으로 Theme/Project Override가 어려워지지 않도록 주의한다.

예를 들어 프로젝트에서 Border Color만 변경할 가능성이 높다면:

```css
border:
  var(--button-border-width)
  solid
  var(--button-border-color);
```

형태를 사용할 수 있다.

하지만 특정 Property를 독립적으로 Override해야 한다면 Longhand 사용도 고려한다.

가독성과 Customization 가능성을 기준으로 판단한다.

---

# 40. `!important`

Base Design System에서는 원칙적으로 사용하지 않는다.

사용해야 한다면 다음 사항을 코드 리뷰에서 설명해야 한다.

```text
왜 Specificity 구조로 해결할 수 없는가?
Project Override를 방해하지 않는가?
HTML/CSS Architecture에 문제가 있는 것은 아닌가?
```

Reset이나 Utility 등 별도의 명확한 목적이 있는 영역은 예외가 될 수 있다.

---

# 41. Global Style 금지

Component CSS에서 Component 밖의 Element에 영향을 주지 않는다.

### 금지

```css
button {
  ...
}

span {
  ...
}

svg {
  ...
}
```

### 권장

```css
.button {}

.button__icon svg {}
```

Component CSS의 영향 범위는 해당 Component 내부로 제한한다.

---

# 42. Project Selector 금지

Base Component CSS에서 Project Scope를 참조하지 않는다.

### 금지

```css
.yuma .button {}

.project-a .input {}
```

Base는 Project를 알지 못해야 한다.

---

# 43. HTML Demo 파일의 역할

각 `component.html`은 Component API를 확인하기 위한 Reference/Demo 역할을 한다.

가능하면 다음 사례를 포함한다.

```text
Variant
Size
Disabled
Icon
대표 State
특수 사용 예
```

`button.html`이라면:

```text
Primary
Secondary
Tertiary

Small
Medium
Large

Disabled

Leading Icon
Trailing Icon
Icon Only
```

등 실제 Component Contract를 확인할 수 있어야 한다.

---

# 44. Demo와 Production API 일치

Demo를 위해 별도의 임시 Class를 만들지 않는다.

`button.html`에 작성된 Component 사용법은 실제 프로젝트에서도 그대로 사용할 수 있어야 한다.

Demo 전용 Layout이 필요하면 Component Class와 분리한다.

예:

```html
<div class="demo-section">
  <button class="button ...">
```

`demo-section`은 Documentation Layer이며 Base Component API가 아니다.

---

# 45. Component Variant 추가 기준

Variant는 디자인이 조금 다르다는 이유로 추가하지 않는다.

새 Variant는 **의미 또는 용도가 다를 때** 추가한다.

예:

```text
Primary
→ 핵심 Action

Secondary
→ 보조 Action

Tertiary
→ 낮은 우선순위 Action
```

단순히:

```text
radius가 다름
색상이 조금 다름
border가 있음
```

정도라면 Project Token 또는 다른 Styling 방식이 적합한지 먼저 검토한다.

---

# 46. Component Size 추가 기준

새 Size는 실제 UI Hierarchy 또는 Layout 요구가 있을 때 추가한다.

숫자가 하나 다르다고 새 Size를 만들지 않는다.

예:

```text
Button 48px
Button 50px
Button 52px
```

이 모두를 각각:

```text
medium
medium2
medium3
```

로 만들지 않는다.

공통 Scale이 가능한지 먼저 검토한다.

---

# 47. 새로운 Component 작성 절차

새 Base Component 작업은 다음 순서로 진행한다.

```text
1. Component 역할 정의
2. 기존 Base Component로 해결 가능한지 확인
3. HTML Semantic Structure 결정
4. Variant 결정
5. Size 결정
6. State 결정
7. Accessibility 검토
8. 필요한 Token Contract 정의
9. Base CSS 구현
10. Responsive 확인
11. Dark Theme 확인
12. Project Token Override 테스트
13. Demo 작성
14. Documentation 작성
```

---

# 48. Component 완료 조건

Component가 완료되었다고 판단하기 전에 다음을 확인한다.

- [ ] 특정 프로젝트명이나 브랜드명이 Base 코드에 없는가?
- [ ] Semantic HTML을 사용했는가?
- [ ] Root Class가 명확한가?
- [ ] Variant가 역할 중심으로 정의되어 있는가?
- [ ] Size API가 일관되어 있는가?
- [ ] Native State를 우선 사용했는가?
- [ ] 필요한 ARIA State가 정의되어 있는가?
- [ ] Focus-visible이 존재하는가?
- [ ] Disabled 상태가 정의되어 있는가?
- [ ] Project별 디자인 변경이 Token으로 가능한가?
- [ ] 불필요한 Hard Coding이 없는가?
- [ ] 구조적 CSS까지 과도하게 Token화하지 않았는가?
- [ ] Dark Theme를 Component CSS에서 직접 구현하지 않았는가?
- [ ] Responsive 디자인 값은 가능한 Token으로 관리하는가?
- [ ] Selector Specificity가 지나치게 높지 않은가?
- [ ] `!important`를 불필요하게 사용하지 않았는가?
- [ ] Demo HTML이 실제 사용 API와 동일한가?
- [ ] 다른 프로젝트에서도 CSS 수정 없이 재사용 가능한가?

---

# 49. Project Component 작성 규칙

Project Component에서도 Base와 동일한 Coding Convention을 최대한 유지한다.

단 Project Component라는 것을 이름에 무조건 노출할 필요는 없다.

중요한 것은 파일 위치와 책임이다.

```text
Base
→ 회사 공통

Project
→ 해당 프로젝트에만 존재
```

Project에서 발견한 Component를 바로 Base Folder로 이동하지 않는다.

Promotion 프로세스를 거친다.

---

# 50. Promotion 시 코드 정리

Project Component를 Base로 Promotion할 때 단순히 파일을 복사하지 않는다.

다음을 다시 검토한다.

```text
Project Naming 제거
Domain Meaning 제거
Hard-coded Brand Color 제거
Project Token 의존 제거
Component API 일반화
Accessibility 검토
Variant 축소
Token Contract 재정의
```

즉 Promotion은:

```text
Project Code 복사
```

가 아니라:

```text
Project Pattern
→ Generalization
→ Base Component
```

과정이다.

---

# 51. Headless UI와 CSS Component의 책임

향후 Headless UI와 연결되는 Component는 다음 책임을 분리한다.

## CSS Component

```text
Visual
Layout
State Styling
Responsive
Theme
```

## Headless Behavior

```text
State Management
Keyboard Navigation
Focus Management
Open / Close
Selection
Escape
Outside Click
ARIA Update
```

예:

```html
<div
  class="accordion"
  data-state="open"
>
```

CSS는:

```css
.accordion[data-state="open"] {}
```

만 담당한다.

`data-state`를 누가 변경하는지는 Headless Layer의 책임이다.

---

# 52. AI 활용을 고려한 코드 작성

향후 AI가 디자인 산출물 또는 기존 코드를 분석하여 Component를 자동 선택할 수 있도록 다음을 지킨다.

### 의미 없는 Class 이름 지양

```text
.type01
.style02
.black
.round
```

대신:

```text
.button--primary
.button--medium
```

처럼 의미를 명확하게 표현한다.

### Component API를 일관되게 유지

Component마다 Variant 표현 방식이 달라지지 않도록 한다.

예:

```text
Button → --primary
Input → --primary
Badge → --primary
```

와 같은 체계적 Naming이 AI와 사람 모두에게 유리하다.

---

# 53. Convention 변경

본 Convention은 초기 Design System 구축 과정에서 계속 보완될 수 있다.

단 개별 프로젝트의 편의를 위해 임의로 규칙을 변경하지 않는다.

Convention 변경이 필요한 경우:

```text
실제 프로젝트 적용
        ↓
문제 발견
        ↓
다른 Component/Project에서도 동일 문제인지 검토
        ↓
공통 문제라면 Convention 수정
```

순서를 따른다.

Project 하나의 예외는 Project Layer에서 먼저 해결한다.

---

# 54. 핵심 원칙 요약

## HTML

> Semantic HTML을 우선한다.

## Class

> Component / Variant / Size / Element의 의미가 명확해야 한다.

## State

> Native → ARIA → data-* 순으로 사용한다.

## CSS

> Component 밖에 영향을 주지 않고 낮은 Specificity를 유지한다.

## Token

> 디자인 변경 가능성을 Token으로 제공하되 CSS Property 전체를 Token화하지 않는다.

## Project

> Base CSS를 복사하거나 수정하지 않고 Project Token으로 차이를 표현한다.

## Theme

> Component CSS가 아니라 Token Layer에서 관리한다.

## Responsive

> 디자인 값 변화는 Token, 구조 변화는 Component CSS가 담당한다.

## Accessibility

> 접근성은 선택사항이 아니라 Base Component Contract의 일부다.

## Promotion

> Project Code를 그대로 Base로 옮기지 않고 범용화 과정을 거친다.

---

# 55. 최종 판단 기준

Component를 작성하거나 리뷰할 때 마지막으로 다음 질문을 확인한다.

> 이 Component의 역할을 코드만 보고 이해할 수 있는가?

> 프로젝트가 바뀌어도 동일한 HTML/CSS를 유지할 수 있는가?

> 디자인 차이를 Token Override로 해결할 수 있는가?

> 특정 프로젝트의 요구가 Base API를 오염시키고 있지 않은가?

> Native HTML과 Accessibility 기능을 충분히 활용하고 있는가?

> 향후 Headless UI가 연결되어도 구조를 다시 작성할 필요가 없는가?

> AI가 Component / Variant / Size / State를 명확하게 식별할 수 있는가?

그리고 가장 중요한 기준은 다음이다.

> **Base Component는 완성된 하나의 디자인이 아니라  
> 여러 프로젝트가 공통으로 사용할 수 있는 UI Contract이다.**