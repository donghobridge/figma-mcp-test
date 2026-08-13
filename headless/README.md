# Headless UI — Behavior Layer

Visual styling lives in `components/**`.  
Web composition lives in `patterns/**`.  
This folder owns **state, keyboard, focus, and ARIA updates** only.

## State Contract

Headless code MUST NOT add visual class names such as `dropdown--open`.

Preferred state surfaces:

```text
Native HTML state   → :checked, :disabled, :open
ARIA state          → aria-expanded, aria-selected, aria-pressed
Internal UI state   → data-state="open|closed|active|idle|selected"
```

CSS components consume those states:

```css
.popover[data-state="open"] {}
.menu__item[aria-selected="true"] {}
```

## Behavior Primitives

| Primitive            | Module                              | Reused by                               |
| -------------------- | ----------------------------------- | --------------------------------------- |
| Escape               | `behaviors/escape.js`               | Dialog, Popover, Menu, Drawer           |
| Outside Interaction  | `behaviors/outside-interaction.js`  | Popover, Menu, Mega Menu                |
| Dismissable Layer    | `behaviors/dismissable-layer.js`    | Dialog, Popover, Menu, Mega Menu        |
| Focus Trap           | `behaviors/focus-trap.js`           | Dialog, Drawer                          |
| Roving Focus         | `behaviors/roving-focus.js`         | Tabs, Menu                              |
| Disclosure           | `behaviors/disclosure.js`           | Accordion, LNB nested nav               |
| Scroll Lock          | `behaviors/scroll-lock.js`          | Dialog, Drawer, Mobile Navigation       |
| Single Selection     | `behaviors/single-selection.js`     | Listbox (future), Tab activation helper |

## Controllers

| Controller   | Module                         | Composes                                      |
| ------------ | ------------------------------ | --------------------------------------------- |
| Dialog       | `controllers/dialog.js`        | `<dialog>` + focus trap + scroll lock + escape |
| Drawer       | `controllers/drawer.js`        | Dialog controller on drawer markup            |
| Menu         | `controllers/menu.js`          | Dismissable + roving focus                    |
| Mega Menu    | `controllers/mega-menu.js`     | Dismissable layer + focus restore             |
| Popover      | `controllers/popover.js`       | Dismissable layer                             |
| Tabs         | `controllers/tabs.js`          | Roving focus + aria-selected + panels         |
| Accordion    | `controllers/accordion.js`     | Disclosure (single/multiple)                  |

## Headless Inventory (Phase 5)

| Component        | Visual | Behavior | Keyboard | Focus | ARIA | Demo | Status       |
| ---------------- | ------ | -------- | -------- | ----- | ---- | ---- | ------------ |
| Dialog           | O      | O        | O        | O     | O    | O    | COMPLETE     |
| Alert Dialog     | O      | O        | O        | O     | O    | O    | COMPLETE     |
| Drawer / Sheet   | O      | O        | O        | O     | O    | O    | COMPLETE     |
| Popover          | O      | O        | O        | O     | O    | O    | COMPLETE     |
| Tooltip          | O      | -        | -        | -     | O    | O    | VISUAL_ONLY  |
| Dropdown Menu    | O      | O        | O        | O     | O    | O    | COMPLETE     |
| Tabs             | O      | O        | O        | O     | O    | O    | COMPLETE     |
| Accordion        | O      | O        | O        | O     | O    | O    | COMPLETE     |
| Select (native)  | O      | Native   | Native   | Native| O    | O    | COMPLETE     |
| Select (custom)  | -      | -        | -        | -     | -    | -    | DEFERRED     |
| Listbox          | -      | Partial  | Partial  | Partial| -   | -    | DEFERRED     |
| Combobox         | -      | -        | -        | -     | -    | -    | DEFERRED     |
| Toast            | -      | -        | -        | -     | -    | -    | DEFERRED     |
| Carousel         | -      | -        | -        | -     | -    | -    | DEFERRED     |
| Checkbox/Radio/Switch | O | Native   | Native   | Native| O    | O    | COMPLETE     |
| Calendar/DatePicker | -   | -        | -        | -     | -    | -    | DEFERRED     |

## DEFERRED Notes

### Toast
- Reason: queue/portal/announcement complexity; lower immediate reuse vs Dialog/Menu
- Contract: `data-state`, live region, dismissable layer
- Future: portal + duration + pause-on-hover

### Combobox / Autocomplete
- Reason: depends on Select/Listbox foundation
- Contract: combobox role, aria-activedescendant, typeahead primitive

### Custom Select / Listbox
- Reason: native `<select>` covers current Base demos; custom listbox after Combobox architecture

### Carousel
- Reason: project-specific; Pagination covers page nav; carousel uses Button controls
- Contract: roving focus + aria-live index

### Calendar / DatePicker
- Reason: high complexity; DateField visual exists
- Contract: grid keyboard nav + focus trap in popover/dialog

## Web Platform First

Before adding custom behavior, evaluate:

```text
<button>
<input type="checkbox|radio">
<select>
<dialog>
<details>/<summary>
Popover API (where supported)
```

## Integration Demo

- Web patterns: `/patterns/demo/site-layout.html`
- Uses: Menu, Drawer, Disclosure, SearchField, Native Select, Dismissable Layer
