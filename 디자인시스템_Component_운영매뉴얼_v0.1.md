# 디자인 시스템 Component 작업 대상 정의 및 운영 매뉴얼

## 1. 목적

이 문서는 프로젝트에서 발견되는 모든 UI를 무조건 공통 Component로 만드는 것을 방지하고, **어떤 UI를 회사 공통 Design System에 포함할 것인지 일관된 기준으로 판단하기 위한 규칙**을 정의한다.

디자인 시스템의 목적은 UI의 종류를 최대한 많이 수집하는 것이 아니다.

목표는 다음과 같다.

> 반복해서 구현되는 UI와 동작을 회사 공통 자산으로 만들고,  
> 각 프로젝트에서는 공통 자산을 상속한 뒤 차이점만 작업한다.

궁극적으로 신규 프로젝트의 퍼블리싱 업무를:

```text
새로 구현
```

에서

```text
공통 Component 선택
→ Project Token 적용
→ 필요한 예외만 구현
```

방식으로 전환하는 것을 목표로 한다.

---

# 2. 기본 구조

회사 UI 시스템은 다음 계층으로 구성한다.

```text
Design Tokens
color / typography / spacing / radius / size ...
        ↓
Base Components
Button / Input / Checkbox / Table ...
        ↓
Headless Behavior
Dropdown / Modal / Tab / Accordion / Tooltip ...
        ↓
프로젝트에서 상속
        ↓
Project Tokens
프로젝트 Look & Feel 변경
        ↓
Project Components
공통 Component로 해결하지 못하는 프로젝트 예외
        ↓
Project Custom UI
해당 프로젝트에만 존재하는 UI
```

각 계층의 책임을 명확하게 구분한다.

---

# 3. Component의 정의

이 시스템에서 Component란 단순히 화면에 반복해서 보이는 HTML 조각을 의미하지 않는다.

다음과 같이 정의한다.

> **특정 프로젝트의 콘텐츠나 브랜드에 종속되지 않으며,  
> 정해진 역할과 상태 및 사용 규칙을 가지고 여러 화면 또는 여러 프로젝트에서 재사용할 수 있는 UI 단위**

예:

```text
Button
Input
Checkbox
Radio
Select
Textarea
Badge
Tabs
Accordion
Modal
Tooltip
Table
Pagination
```

Component에는 단순한 외형뿐 아니라 다음 항목이 포함될 수 있다.

```text
구조
Variant
Size
State
Responsive Rule
Accessibility Rule
Token Contract
Interaction State 표현
```

---

# 4. 모든 UI가 Base Component가 되는 것은 아니다

프로젝트에서 새로운 UI가 발견되었다고 해서 바로 Base Design System에 추가하지 않는다.

UI는 기본적으로 다음 세 종류 중 하나로 분류한다.

```text
Base Component
Project Component
Project Custom UI
```

필요한 경우 별도로 재사용 가능한 동작을:

```text
Headless Behavior
```

로 분리한다.

---

# 5. Base Component

## 정의

여러 프로젝트에서 공통적으로 사용할 가능성이 높고, 특정 브랜드나 서비스 도메인에 종속되지 않는 UI.

예:

```text
Button
Input
Checkbox
Radio
Textarea
Select
Table
Modal
Tabs
Accordion
Tooltip
Pagination
```

Base Component는 회사의 공통 Design System에 포함한다.

---

## Base Component의 조건

다음 특성을 여러 개 만족할수록 Base Component에 적합하다.

### 범용성

특정 프로젝트가 아니라 다양한 서비스에서 사용할 수 있어야 한다.

좋은 예:

```text
Button
Input
Modal
Tooltip
```

좋지 않은 예:

```text
노란우산 가입자 등급 카드
세무 상담 유형 선택 카드
특정 보험 상품 비교 카드
```

---

### 반복성

여러 화면 또는 여러 프로젝트에서 반복해서 등장할 가능성이 높아야 한다.

단, Button이나 Input처럼 웹 서비스에서 사용이 명확한 기본 UI는 프로젝트 반복 검증을 기다리지 않고 초기 Base Component로 정의할 수 있다.

---

### 역할이 명확할 것

Component가 무엇을 담당하는지 명확해야 한다.

예:

```text
Button
→ 사용자의 Action 실행

Checkbox
→ 복수 선택 상태 표현

Tabs
→ 동일 문맥 내 콘텐츠 전환
```

역할을 한 문장으로 설명하기 어렵다면 너무 많은 책임을 가진 UI일 가능성이 있다.

---

### 프로젝트 디자인과 분리 가능할 것

Component 구조는 그대로 유지하면서 Token 변경으로 프로젝트별 Look & Feel을 상당 부분 표현할 수 있어야 한다.

예:

```text
Base Button
    +
Project Token

→ YUMA Button
→ Project B Button
→ Project C Button
```

이 구조가 가능해야 한다.

---

### API를 정의할 수 있을 것

다음과 같은 사용 규칙을 명확하게 정의할 수 있어야 한다.

```text
Variant
Size
State
Content
Disabled 여부
Icon 여부
Accessibility
```

예:

```text
Button

Variant
- primary
- secondary
- tertiary

Size
- sm
- md
- lg

State
- default
- hover
- focus
- active
- disabled
```

---

# 6. Project Component

## 정의

Base Component의 개념과 구조는 공유하지만, 특정 프로젝트에서만 필요한 스타일 또는 Variant가 존재하는 경우.

예를 들어 회사 Base Button에는:

```text
Primary
Secondary
Tertiary
```

만 존재하지만 YUMA 프로젝트에서만 특별한:

```text
Membership Button
```

이 필요한 경우를 생각할 수 있다.

이 경우 처음부터 Base Button의 Variant로 추가하지 않는다.

```text
Base Button
       +
YUMA Project Component
```

형태로 처리한다.

---

## Project Component가 필요한 경우

다음 상황에서 사용한다.

```text
Base Component의 구조를 재사용할 수 있음
+
Project Token만으로는 표현할 수 없음
+
해당 프로젝트에서만 필요한 추가 스타일/Variant가 있음
```

즉 판단 순서는:

```text
Base Token으로 해결?
        ↓ NO

Component Token 추가로 범용 해결 가능?
        ↓ NO

Project Component로 해결
```

이다.

---

# 7. Project Custom UI

## 정의

특정 서비스의 콘텐츠, 비즈니스 구조 또는 도메인에 강하게 종속되어 있는 UI.

예:

```text
가입자 등급 현황
세무 상담 유형 카드
노란우산 가입 혜택 카드
특정 상품 비교 UI
업무 프로세스 전용 Step UI
```

이러한 UI는 다른 프로젝트에서 사용할 가능성이 낮기 때문에 처음부터 Base Design System에 포함하지 않는다.

---

## Project Custom UI의 원칙

Project Custom UI도 가능한 경우 내부에서는 Base Component를 조합한다.

예:

```text
Membership Card

├ Badge        → Base
├ Button       → Base
├ Tooltip      → Base
└ Card Layout  → Project Custom
```

즉 Custom UI라고 해서 모든 코드를 새로 만드는 것은 아니다.

> **Base Component를 조합하고, 정말 프로젝트에만 필요한 구조만 Custom으로 작성한다.**

---

# 8. Headless Behavior

UI의 디자인과 별개로 여러 Component에서 반복되는 동작은 Headless Behavior 후보로 본다.

예:

```text
Dropdown
Modal
Tabs
Accordion
Tooltip
Select
```

여기에서 Headless Layer가 담당할 수 있는 항목은 다음과 같다.

```text
open / close
selection
keyboard navigation
focus management
focus trap
outside click
Escape 처리
ARIA state
disabled state
```

CSS Component는 상태를 표현한다.

Headless Behavior는 상태와 동작을 관리한다.

예:

```text
Headless

data-state="open"
aria-expanded="true"

        ↓

Component CSS

[data-state="open"] {
  ...
}
```

동작과 디자인의 책임을 가능한 분리한다.

---

# 9. Component 작업 대상 판단 순서

새 UI가 등장하면 다음 순서로 판단한다.

```text
새 UI 발견
    ↓
기존 Base Component인가?
    ↓ YES
기존 Component 사용
    ↓
Project Token으로 디자인 표현 가능한가?
    ↓ YES
Project Token만 변경
```

해결되지 않을 경우:

```text
Project Token으로 해결 불가
    ↓
Base Component에 범용적인 옵션을 추가하면
다른 프로젝트에서도 활용 가능한가?
    ↓ YES
Base Component 확장 검토
```

그렇지 않으면:

```text
Base 확장 가치 없음
    ↓
기존 Base 구조를 활용할 수 있는가?
    ↓ YES
Project Component
    ↓ NO
Project Custom UI
```

---

# 10. Base Component에 추가하면 안 되는 대표적인 경우

다음 이유만으로 Base Component를 추가하지 않는다.

### 화면에 새 디자인이 등장했다

새로운 모양이 등장했다는 사실만으로 새로운 Component는 아니다.

기존 Component의 Variant 또는 Token 변경으로 표현 가능한지 먼저 확인한다.

---

### 디자인이 조금 다르다

예:

```text
Button radius가 다름
Button 높이가 다름
Button 색상이 다름
Card padding이 다름
```

이런 차이는 대부분 새로운 Component가 아니라 Token의 책임이다.

---

### 프로젝트에서 한 번 사용했다

한 프로젝트에서 필요했다는 사실은 회사 공통 Component가 되어야 한다는 근거가 아니다.

Project Layer에서 먼저 구현한다.

---

### HTML 구조가 조금 다르다

Markup 차이 자체가 새로운 Component를 의미하지 않는다.

역할, 상태, API가 실질적으로 다른지 먼저 판단한다.

---

### 이름을 붙일 수 있다

디자인 요소에 이름을 붙일 수 있다는 이유만으로 Component화하지 않는다.

재사용성과 책임이 존재해야 한다.

---

# 11. Token과 Component의 경계

디자인 차이가 다음과 같은 값의 변화라면 우선 Token으로 해결한다.

```text
color
background
font
font-size
font-weight
line-height
spacing
padding
gap
height
radius
border
shadow
opacity
icon size
```

예:

```text
Project A Button
radius 8px

Project B Button
radius 16px
```

이 경우:

```text
Button A
Button B
```

두 Component를 만드는 것이 아니라:

```css
--button-radius-md
```

를 Project Token에서 변경한다.

---

# 12. Component Token 추가 기준

현재 Base Component에서 특정 디자인을 표현할 수 없다고 해서 바로 새로운 Component를 만들지 않는다.

다음과 같이 합리적인 Customization Point라면 Component Token 추가를 검토한다.

예:

```css
--button-border-width: 0;
--button-border-color: transparent;
--button-shadow: none;
```

현재 Base 디자인에서는 사용하지 않더라도 여러 프로젝트에서 현실적으로 변경될 가능성이 높은 속성은 Token Contract에 포함할 수 있다.

단 다음과 같은 구조적 CSS까지 Token화하지 않는다.

```text
display
position
flex-direction
cursor
overflow
```

Token은 **디자인을 변경하기 위한 인터페이스**다.

---

# 13. Promotion 원칙

Project Component 또는 Project Custom UI가 다른 프로젝트에서도 반복해서 등장하면 Base 승격을 검토한다.

이를 Promotion이라고 한다.

```text
Project 특수 요구
        ↓
Project Layer에서 구현
        ↓
다른 프로젝트에서도 반복 등장
        ↓
공통화 가치 검토
        ↓
Base Design System으로 Promotion
```

---

# 14. Promotion 판단 기준

반복되었다는 이유만으로 자동 승격하지 않는다.

다음 항목을 함께 검토한다.

```text
재사용 빈도
역할의 동일성
Markup의 유사성
Interaction의 동일성
프로젝트별 차이를 Token으로 흡수할 수 있는지
Component API를 단순하게 유지할 수 있는지
유지보수 비용보다 재사용 효과가 큰지
```

예를 들어 세 프로젝트에서 비슷한 Card가 등장했더라도 각각 목적과 구조가 완전히 다르면 하나의 Base Card로 합치지 않을 수 있다.

---

# 15. Promotion보다 중요한 원칙

공통화를 위해 지나치게 많은 옵션이 필요한 Component는 공통 Component가 아닐 가능성이 높다.

다음과 같은 Component는 경계해야 한다.

```text
variant 15개
예외 class 다수
특정 프로젝트 조건 다수
복잡한 modifier 조합
프로젝트마다 DOM 구조가 다름
```

공통화를 위해 Component가 지나치게 복잡해진다면:

```text
Base로 유지
+
Project Component 분리
```

가 더 적합할 수 있다.

---

# 16. Component 작업 범위

Base Component를 작업할 때 단순히 기본 모양 하나만 만들지 않는다.

최소 다음 항목을 검토한다.

### Structure

Component의 semantic HTML 구조.

### Variant

역할이 다른 표현 방식.

예:

```text
primary
secondary
tertiary
```

### Size

필요한 크기 체계.

예:

```text
sm
md
lg
```

### State

Component에 필요한 상태.

```text
default
hover
focus-visible
active
disabled
selected
checked
open
error
```

Component 특성에 필요한 상태만 정의한다.

### Content

예:

```text
Text
Icon + Text
Icon only
```

### Responsive

Breakpoint에 따라 실제로 Component 규칙이 변경되는지 검토한다.

### Dark Theme

Theme에 따라 변경되어야 하는 Semantic / Component Token을 검토한다.

### Accessibility

Keyboard, focus, disabled, ARIA 등의 기본 규칙을 포함한다.

---

# 17. Component HTML 원칙

Base Component는 특정 프로젝트 Markup에 종속되지 않는다.

가능하면 semantic HTML을 우선한다.

예:

```html
<button type="button">
```

Action을 위해 불필요하게:

```html
<div>
<span>
```

을 Button처럼 사용하지 않는다.

Component HTML은 향후 AI가 분석했을 때도 역할을 명확히 파악할 수 있도록 구성한다.

---

# 18. Component Class Naming 원칙

Class Naming은 Component의 역할을 명확하게 식별할 수 있어야 한다.

기본 구조는 다음 요소를 구분할 수 있어야 한다.

```text
Component
Variant
Size
Element
```

예시 개념:

```text
button
button--primary
button--large
button__icon
```

구체적인 Naming Convention은 별도 Coding Convention에서 정의할 수 있지만 다음 원칙은 공통으로 적용한다.

```text
프로젝트 이름 사용 금지
색 이름 기반 Variant 지양
지나친 축약 지양
상태를 의미 없는 class로 관리하지 않음
selector 구조에 의존하지 않음
```

예:

```text
button-yellow
```

보다는:

```text
button--secondary
```

처럼 역할 중심으로 정의한다.

---

# 19. 색상 이름을 Component 의미로 사용하지 않는다

Base에서는 다음 이름을 피한다.

```text
button-blue
button-yellow
card-green
border-red
```

색상은 프로젝트에 따라 변경될 수 있기 때문이다.

역할을 표현한다.

```text
primary
secondary
success
warning
error
```

그리고 실제 색상은 Token이 결정한다.

---

# 20. 프로젝트 디자인 변경의 기본 원칙

새 프로젝트에서는 Base CSS 자체를 복사하여 수정하지 않는다.

기본 흐름:

```text
Base Component 그대로 사용
        +
Project Token override
```

예:

```text
Button 구조
Button CSS
Button State

→ 그대로 사용
```

프로젝트에서는:

```css
--color-primary-500
--button-radius-md
--button-height-md
--button-primary-bg
```

등 필요한 값만 변경한다.

---

# 21. 디자인 시스템 Component의 성공 기준

Base Component가 잘 설계되었는지는 다음 질문으로 판단한다.

### 재사용성

다음 프로젝트에서도 Component CSS를 수정하지 않고 사용할 수 있는가?

### 변경 가능성

프로젝트 디자인 차이의 상당 부분을 Token 변경으로 해결할 수 있는가?

### 단순성

특정 프로젝트 예외 때문에 Component API가 복잡해지지 않았는가?

### 독립성

프로젝트 브랜드나 콘텐츠에 종속되어 있지 않은가?

### 명확성

Component / Variant / Size / State가 코드에서 명확하게 구분되는가?

### 접근성

기본적인 웹 접근성 규칙을 Component 자체가 제공하는가?

### AI 식별 가능성

향후 AI가 코드를 분석했을 때 어떤 Component이고 어떤 Variant인지 쉽게 판단할 수 있는가?

---

# 22. Component 작업 우선순위

디자인 시스템 구축 초기에는 모든 Component를 한 번에 만드는 것을 목표로 하지 않는다.

다음 요소를 기준으로 우선순위를 결정한다.

```text
프로젝트에서 등장하는 빈도
반복 구현 공수
동작 구현 난이도
디자인 변경 빈도
여러 프로젝트에서의 재사용 가능성
접근성 구현 비용
AI 자동화 효과
```

일반적으로 다음과 같은 기초 UI부터 구축하는 것이 적합하다.

```text
Button
Input
Textarea
Checkbox
Radio
Select
Badge
Table
Tabs
Accordion
Modal
Tooltip
Pagination
```

실제 구축 순서는 회사 프로젝트 사용 빈도를 기준으로 결정한다.

---

# 23. 신규 UI 검토 Checklist

새로운 UI가 발견되면 다음 질문을 순서대로 확인한다.

- [ ] 기존 Base Component로 표현할 수 있는가?
- [ ] Project Token 변경만으로 표현할 수 있는가?
- [ ] Base Component에 범용적인 Token 하나를 추가하면 해결되는가?
- [ ] 특정 프로젝트의 브랜드 또는 업무 의미에 종속되어 있는가?
- [ ] 다른 프로젝트에서도 동일한 역할로 사용할 가능성이 높은가?
- [ ] 역할과 API를 명확하게 정의할 수 있는가?
- [ ] Component로 만들었을 때 현재보다 유지보수가 쉬워지는가?
- [ ] 공통화를 위해 지나치게 많은 Variant나 예외가 필요하지 않은가?
- [ ] 반복되는 Interaction이라면 Headless Behavior로 분리할 수 있는가?
- [ ] 이미 Project에서 구현된 UI라면 다른 프로젝트에서도 반복해서 등장했는가?

검토 결과에 따라 다음 중 하나로 결정한다.

```text
Base Component
Project Component
Project Custom UI
Headless Behavior
Promotion Candidate
```

---

# 24. 최종 원칙

Design System의 목표는 모든 UI를 공통화하는 것이 아니다.

**반복되는 것을 공통화하고, 다른 것은 다르게 유지한다.**

따라서 다음 원칙을 유지한다.

> Token으로 해결할 수 있는 차이는 Token으로 해결한다.

> Base Component로 해결할 수 있는 UI는 새로 만들지 않는다.

> 프로젝트 특수 요구는 우선 Project Layer에 둔다.

> 반복되는 Project UI만 Promotion을 검토한다.

> 공통화를 위해 Base Component를 지나치게 복잡하게 만들지 않는다.

> 디자인과 동작은 가능한 분리한다.

> Component는 특정 프로젝트가 아니라 앞으로의 여러 프로젝트를 기준으로 설계한다.

최종적으로 모든 Component 작업은 다음 질문으로 판단한다.

> **“이 UI를 공통화함으로써 다음 프로젝트에서 실제 구현 공수가 줄어드는가?”**

그렇지 않다면 Base Design System에 포함하지 않는 것이 더 좋은 선택일 수 있다.