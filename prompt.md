```yaml
Using MCP (figma_generate_html_prompt), convert Figma design to HTML using the Yuma component library.

- figmaKey: {X7nCYTfIm91mjBLbbZoCPm}
- nodeId: {2-20684}

## Workflow (MUST follow in order)

### Pass 1: Analyze (do NOT generate code yet)
1. Read `/README.md`, `/import.css`, and one Pattern demo under `/patterns/` to learn include paths and class conventions.
2. Run `figma_generate_html_prompt` and read ONLY the STRUCTURE_TREE_WITH_BBOX section.
3. Map each Figma node to a project role:
   - GNB → `data-include-path="/patterns/gnb/gnb.html"` (do NOT write GNB markup)
   - Header → `data-include-path="/patterns/header/site-header.html"` when needed
   - Footer → `data-include-path="/patterns/footer/site-footer.html"` (do NOT write footer markup)
   - Breadcrumb → `data-include-path="/patterns/breadcrumb/breadcrumb.html"` or existing breadcrumb markup
   - Base UI (button, input, table, …) → `/components/{name}/{name}.html` with `data-prop-*`
   - LNB / scroll-to-top / floating buttons → EXCLUDE entirely (common/pattern JS)
   - Content area → semantic markup + Base Components

### Pass 2: Generate code
4. Write `index.html` with `/import.css` + `/common.js` only (no page `styles.css`).
5. Prefer Base Components and Patterns over custom CSS.

## Strict Rules

- ZERO Figma artifacts: no `data-node`, `data-figma`, or any Figma node ID in HTML or CSS.
- ZERO `[data-node="..."]` CSS selectors. All selectors must be class-based.
- ZERO Figma layer names as classes (no `frame-*`, `vector-*`, `group-*`, `node-*`, etc.).
- Class names must be semantic BEM only.
- Use existing project classes where they match.
- Do not create page-specific CSS or embedded `<style>`.
```

```bash
Using MCP (`figma_generate_html_prompt`), convert the specified Figma design to HTML using the project’s existing common CSS (`/import.css`).

* figmaKey: {figmaKey}
* nodeId: {node-id}
* outputDirectory: `/pages/demo-page/{node-id}/`
  * Normalize nodeId by converting `:` to `-`
  * This request → `/pages/demo-page/{node-id}/`

## Workflow (MUST follow in order)

### Pass 1: Analyze — do NOT generate code yet

1. Read `/README.md`, `/import.css`, `/patterns/README.md`, and `/components/` inventory.

2. Inspect Base Components and Pattern HTML contracts. Prefer registered includes.

3. Run `figma_generate_html_prompt`.

4. Read ONLY the `STRUCTURE_TREE_WITH_BBOX` section from the MCP response.

   * Do not use generated HTML/CSS/class suggestions from other sections.

5. Map each Figma node to the appropriate project role:

   * GNB → `<div data-include-path="/patterns/gnb/gnb.html"></div>`
   * Header → `<div data-include-path="/patterns/header/site-header.html"></div>` when needed
   * Footer → `<div data-include-path="/patterns/footer/site-footer.html"></div>`
   * Breadcrumb → `/patterns/breadcrumb/breadcrumb.html` or existing breadcrumb markup
   * Base components → `/components/{name}/{name}.html` + `data-prop-*`
   * LNB / scroll-to-top / floating buttons → exclude entirely
   * Content area → semantic HTML + Base Components

6. Map layout/visual properties to existing common CSS / component classes.

   * Prefer `/import.css` (base + patterns + project tokens).
   * Do not create a new page-specific CSS file.
   * Do not add an embedded `<style>` block or inline `style` attributes.
   * Do not modify existing common CSS files.

### Pass 2: Generate HTML

7. Create `/pages/demo-page/{node-id}/` if needed.

8. Write `/pages/demo-page/{node-id}/index.html`.

9. Document head must include:

   * `<link rel="stylesheet" href="/import.css" />`
   * `<script defer src="/common.js"></script>`
   * Pattern navigation script when using GNB/Header/LNB: `/patterns/demo/site-navigation.js`

10. Build content with semantic BEM and Base Component includes.

11. Convert Figma Auto Layout into markup that works with existing layout/pattern classes.

12. Verify before finishing:

* File exists at `/pages/demo-page/{node-id}/index.html`
* No CSS file was created
* GNB/Footer/Header use the required include paths
* Excluded common UI elements were not added

## Output Accumulation Rules

* Store all generated pages under `/pages/demo-page/`.
* One subdirectory per normalized node ID (`:` → `-`).
* Each page directory contains only `index.html`.
* Do not overwrite other demo-page directories unless explicitly instructed.

## Strict Rules

* Generate only `/pages/demo-page/{node-id}/index.html`
* Do NOT create `styles.css` or any other CSS file
* Use `/import.css` as the sole stylesheet entry
* GNB and Footer must load through `data-include-path`
* No Figma artifacts (`data-node`, `data-figma`, layer-name classes)

## Output

After saving the file, return only:

* Full `/pages/demo-page/{node-id}/index.html`
* Brief summary of what was built
* List of any Figma styling that could not be reproduced with common CSS / components

Do not output CSS.
```
