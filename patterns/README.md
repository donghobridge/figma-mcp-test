# Web Patterns Layer

Composition layer above Base Components and Headless Behaviors.

```text
import.css          → Base Components + Tokens
patterns/patterns.css → Web Pattern visual CSS
patterns/demo/site-navigation.js → Headless wiring (shared)
```

## Pattern Inventory

| Pattern | CSS | HTML Contract | Demo | Headless | Status |
|---------|-----|---------------|------|----------|--------|
| Site Header | `header/site-header.css` | `header/site-header.html` | O | Menu, Drawer | COMPLETE |
| GNB | `gnb/gnb.css` | `gnb/gnb.html` | O | Menu, Mega Menu | COMPLETE |
| GNB Submenu | in `gnb.css` + `.menu` component | in GNB/header markup | O | `createDropdownMenu` | CSS_ONLY_VALID |
| Mega Menu | in `gnb.css` | in GNB markup | O | `createMegaMenu` | COMPLETE |
| LNB | `lnb/lnb.css` | `lnb/lnb.html` | O | `bindDisclosure` | COMPLETE |
| LNB Sublist | in `lnb.css` | in LNB markup | O | Disclosure | CSS_ONLY_VALID |
| Mobile Navigation | Drawer + LNB reuse | integration + header demo | O | `createDrawer` | COMPLETE |
| Site Footer | `footer/site-footer.css` | `footer/site-footer.html` | O | Native select | COMPLETE |
| Footer nav/info | in `site-footer.css` | in footer markup | O | — | CSS_ONLY_VALID |
| Breadcrumb | `breadcrumb/breadcrumb.css` | `breadcrumb/breadcrumb.html` | O | — | COMPLETE |
| Skip Link | `skip-link/skip-link.css` | in integration demo | O | — | CSS_ONLY_VALID |
| Page Container | `layout/page-container.css` | used in demos | O | — | CSS_ONLY_VALID |
| Content + LNB | `layout/content-with-lnb.css` | integration demo | O | — | CSS_ONLY_VALID |

## CSS-only 판정

**CSS_ONLY_VALID** — 상위 Pattern 내부 Element, 상위 Demo에서 Markup·Behavior coverage 확인됨.

## Demo Pages

| URL | Purpose |
|-----|---------|
| `/patterns/demo/site-layout.html` | Full integration |
| `/patterns/header/site-header.html` | Header compositions |
| `/patterns/gnb/gnb.html` | GNB + interaction |
| `/patterns/lnb/lnb.html` | LNB flat + nested |
| `/patterns/footer/site-footer.html` | Footer composition |
| `/patterns/breadcrumb/breadcrumb.html` | Breadcrumb semantic |

## Headless Wiring

`initSiteNavigation(root)` from `/patterns/demo/site-navigation.js`

| Data attribute | Behavior |
|----------------|----------|
| `data-dropdown-trigger` | Menu / Mega Menu |
| `data-mobile-nav-trigger` | Drawer |
| `data-lnb-disclosure` | Disclosure |

GNB submenu = Base **Menu** component (`.menu`), not a separate Pattern.
