/**
 * page-spec → data-include-path HTML 조립기 (마크업 하드코딩 없음)
 * - 마크업/기본값은 component HTML + component-map.json 에서만 관리
 * - 이 파일은 include 속성·슬롯 조립만 담당
 *
 * n8n Code 노드에서는 make-loader 로 인라인 삽입되어 런타임 외부 파일 로드 없음.
 */
module.exports = function ($input, helpers) {
  const fs = require('fs');
  const pageSpec = $input.first().json;
  const extractedMap = (helpers && helpers.extractedMap) || {};
  const componentMap = extractedMap.data && typeof extractedMap.data === 'object'
    ? extractedMap.data
    : extractedMap;

  const LIBRARY_ROOT = (helpers && helpers.libraryRoot)
    || '/workspace/yuma-component-library';

  function escapeAttr(value) {
    return String(value == null ? '' : value)
      .replace(/\\+([*_()[\]])/g, '$1')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '&#10;');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/\\+([*_()[\]])/g, '$1')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function dataKey(prop) {
    return prop.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
  }

  function isGlyphLabel(value) {
    const text = String(value == null ? '' : value).trim();
    if (!text) return true;
    return /^[\s○●◎◯◉□■☐☑✓✔✕✖×><›‹·•‧∙]+$/u.test(text);
  }

  function usableLabels(list) {
    const seen = new Set();
    const out = [];
    for (const raw of list || []) {
      const text = String(raw || '').trim();
      if (!text || isGlyphLabel(text) || seen.has(text)) continue;
      seen.add(text);
      out.push(text);
    }
    return out;
  }

  function loadLibraryFile(relPath) {
    if (!relPath) return '';
    const clean = String(relPath).replace(/^\/+/, '');
    try {
      return fs.readFileSync(`${LIBRARY_ROOT}/${clean}`, 'utf8');
    } catch (_) {
      return '';
    }
  }

  function applyDefaults(definition, content) {
    const defaults = definition.defaults || {};
    for (const [key, value] of Object.entries(defaults)) {
      if (content[key] == null || content[key] === '') content[key] = value;
    }
    return content;
  }

  function renderIncludeDiv(definition, content, comment, pathOverride) {
    const includePath = pathOverride || definition.path;
    if (!includePath) return comment ? `<!-- ${comment} -->` : '';

    const attrs = [`data-include-path="${escapeAttr(includePath)}"`];
    for (const key of definition.props || []) {
      if (String(definition.propTypes?.[key] || '') === 'html') continue;
      let value = content[key];
      if (value == null || value === '') {
        // 선택 슬롯(file2 없는 downloadHref2 등)에 '#'를 넣으면 빈 행이 살아남음
        if (/^(downloadHref|previewHref)(\d+)$/i.test(key)) {
          const n = key.match(/(\d+)$/)[1];
          if (!content[`file${n}`] && !content[`type${n}`]) continue;
          value = '#';
        } else if (/href/i.test(key)) {
          value = '#';
        } else {
          continue;
        }
      }
      attrs.push(`data-prop-${dataKey(key)}="${escapeAttr(value)}"`);
    }
    if (content.variantClass) {
      attrs.push(`data-class-variant="${escapeAttr(content.variantClass)}"`);
    }

    const htmlProps = (definition.props || []).filter(
      (key) => String(definition.propTypes?.[key] || '') === 'html'
    );

    // html props: wrap include host with temporary placeholders replaced after
    // import.js only supports data-prop attrs — for nested includes we embed
    // children as raw HTML into a host that already has the template loaded via
    // a two-step: use a wrapper that sets body via inner template fill here.
    if (htmlProps.length === 0) {
      const head = comment ? `<!-- ${comment} -->\n` : '';
      return `${head}<div ${attrs.join(' ')}></div>`;
    }

    // For html-slot components: load template and substitute {htmlProp} + text props
    let template = loadLibraryFile(includePath);
    if (!template) {
      const head = comment ? `<!-- ${comment}: missing template ${includePath} -->\n` : '';
      return `${head}<div ${attrs.join(' ')}></div>`;
    }

    for (const key of definition.props || []) {
      const raw = content[key];
      if (String(definition.propTypes?.[key] || '') === 'html') {
        template = template.replace(
          new RegExp(`\\{\\s*${key}\\s*\\}`, 'g'),
          raw == null ? '' : String(raw)
        );
      } else {
        const value = raw == null || raw === ''
          ? (/href/i.test(key) ? '#' : '')
          : raw;
        template = template.replace(
          new RegExp(`\\{\\s*${key}\\s*\\}`, 'g'),
          escapeHtml(value)
        );
      }
    }
    template = template.replace(
      /\{\s*variantClass\s*\}/g,
      escapeAttr(content.variantClass || '')
    );
    template = template.replace(/\{\s*[A-Za-z][\w]*\s*\}/g, '');

    const head = comment ? `<!-- ${comment} -->\n` : '';
    return `${head}${template}`;
  }

  function resolveItemComponentName(definition, item) {
    const byType = definition.itemComponentByType || {};
    const choiceType = String(
      item.content?.choiceType || item.content?.type || 'radio'
    ).toLowerCase();
    if (byType[choiceType]) return byType[choiceType];
    return definition.itemComponent || null;
  }

  function normalizeItemProps(itemComponentName, entry, index, parentItem) {
    const order = parentItem.order || 0;
    if (typeof entry === 'string') {
      const label = entry;
      if (itemComponentName === 'FormChoiceOption' || itemComponentName === 'FormChoiceCheckboxOption') {
        return {
          label,
          id: `choice-${order}-${index}`,
          name: `choice-${order}`,
          checkedAttr: itemComponentName === 'FormChoiceOption' && index === 0 ? ' checked' : '',
        };
      }
      if (itemComponentName === 'FormTermItem') {
        return { label, id: `term-${order}-${index}`, href: '#' };
      }
      if (itemComponentName === 'GenericListItem') {
        return { label };
      }
      return { label };
    }
    if (entry && typeof entry === 'object') {
      return {
        label: entry.label || entry.text || '',
        href: entry.href || '#',
        id: entry.id || `item-${order}-${index}`,
        name: entry.name || `choice-${order}`,
        checkedAttr: entry.checked ? ' checked' : '',
        ...entry,
      };
    }
    return {};
  }

  function renderItemListHtml(definition, item) {
    const itemComponentName = resolveItemComponentName(definition, item);
    if (!itemComponentName) return '';
    const itemDef = componentMap[itemComponentName] || {};
    if (!itemDef.path) return '';

    const sourceKey = definition.itemsSource || 'items';
    let entries = item[sourceKey];
    if ((!entries || !entries.length) && sourceKey === 'options') {
      entries = item.options;
    }
    if (sourceKey === 'options' || sourceKey === 'items') {
      if (Array.isArray(entries) && entries.every((e) => typeof e === 'string' || e == null)) {
        entries = usableLabels(entries);
      }
    }

    return (entries || []).map((entry, index) => {
      const props = applyDefaults(
        itemDef,
        normalizeItemProps(itemComponentName, entry, index, item)
      );
      // Item markup comes from component file via server-side fill (small templates)
      let template = loadLibraryFile(itemDef.path);
      if (!template) {
        return renderIncludeDiv(itemDef, props, `${itemComponentName}`);
      }
      for (const key of itemDef.props || []) {
        const value = props[key];
        if (key === 'checkedAttr') {
          template = template.replace(
            /\{\s*checkedAttr\s*\}/g,
            value == null ? '' : String(value)
          );
          continue;
        }
        template = template.replace(
          new RegExp(`\\{\\s*${key}\\s*\\}`, 'g'),
          escapeHtml(value == null ? (/href/i.test(key) ? '#' : '') : value)
        );
      }
      template = template.replace(/\{\s*[A-Za-z][\w]*\s*\}/g, '');
      return template;
    }).join('\n');
  }

  function renderLeaf(item) {
    const definition = componentMap[item.component] || {};
    if (!definition.path) return `<!-- missing path for ${item.component} -->`;

    const content = applyDefaults(definition, { ...(item.content || {}) });

    if (item.component === 'FormChoiceGroup') {
      const optionCount = usableLabels(item.options).length;
      content.optionsLayoutClass = optionCount > 2 ? 'radio-container--col' : '';
    }

    const htmlProp = definition.itemsHtmlProp;
    if (htmlProp && (definition.props || []).includes(htmlProp)) {
      content[htmlProp] = renderItemListHtml(definition, item);
    }

    return renderIncludeDiv(
      definition,
      content,
      `${item.component}: ${item.figmaNode || ''}`,
      item.includePath || ''
    );
  }

  function renderContainer(item) {
    const definition = componentMap[item.component] || {};
    const content = applyDefaults(definition, { ...(item.content || {}) });
    const childrenHtml = (item.children || [])
      .map(renderInclude)
      .filter(Boolean)
      .join('\n\n');

    if ((definition.props || []).includes('bodyHtml')) {
      content.bodyHtml = childrenHtml;
      return renderIncludeDiv(
        definition,
        content,
        `${item.component}: ${item.figmaNode || ''}`,
        item.includePath || ''
      );
    }

    // acceptsChildren but no bodyHtml slot — emit children only
    return `<!-- ${item.component}: ${item.figmaNode || ''} -->\n${childrenHtml}`;
  }

  function renderInclude(item) {
    const definition = componentMap[item.component] || {};
    if (definition.acceptsChildren) return renderContainer(item);
    return renderLeaf(item);
  }

  const FORM_LAYOUT_COMPONENTS = new Set([
    'EventParticipationForm',
    'FormCard',
    'FormTextField',
    'FormEmailField',
    'FormDateField',
    'FormAddressField',
    'FormChoiceGroup',
    'FormCheckbox',
    'FormFileUpload',
    'FormTerms',
    'FormButtonGroup',
  ]);

  function walkComponents(items, visit) {
    for (const item of items || []) {
      visit(item);
      if (item.children && item.children.length) walkComponents(item.children, visit);
    }
  }

  function shouldUseFormLayout(spec) {
    const mode = String(spec.layoutMode || spec.pageType || '').toLowerCase();
    if (mode === 'form') return true;
    if (mode === 'content' || mode === 'detail' || mode === 'default') return false;
    let found = false;
    walkComponents(spec.components, (item) => {
      if (FORM_LAYOUT_COMPONENTS.has(item.component)) found = true;
    });
    return found;
  }

  let header = '';
  let footer = '';
  const heading = [];
  const content = [];
  const actions = [];

  for (const item of pageSpec.components || []) {
    const definition = componentMap[item.component] || {};
    // actions 슬롯 Button: variant 없으면 primary. 이미 solid 등이 있으면 유지
    if (
      item.component === 'Button'
      && definition.slot === 'actions'
      && !(item.content && item.content.variantClass)
    ) {
      item.content = { ...(item.content || {}), variantClass: 'ui-button--primary' };
    }
    const html = renderInclude(item);
    if (!html) continue;
    if (definition.role === 'header' || definition.slot === 'header') header = html;
    else if (definition.role === 'footer' || definition.slot === 'footer') footer = html;
    else if (definition.slot === 'heading') heading.push(html);
    else if (definition.slot === 'actions') actions.push(html);
    else content.push(html);
  }

  const useFormLayout = shouldUseFormLayout(pageSpec);
  const title = escapeHtml(pageSpec.pageName || 'Figma Wireframe');

  const shellDef = componentMap.WireframeShell || {
    path: '/layouts/wireframe-shell.html',
  };
  let shell = loadLibraryFile(shellDef.path);
  if (!shell) {
    shell = '{header}\n{heading}\n{content}\n{actions}\n{footer}';
  }
  shell = shell
    .replace(/\{\s*pageVariantClass\s*\}/g, useFormLayout ? 'layout-page--form' : '')
    .replace(/\{\s*detailVariantClass\s*\}/g, useFormLayout ? 'layout-detail--form' : '')
    .replace(/\{\s*header\s*\}/g, header)
    .replace(/\{\s*heading\s*\}/g, heading.join('\n\n'))
    .replace(/\{\s*content\s*\}/g, content.join('\n\n'))
    .replace(/\{\s*actions\s*\}/g, actions.join('\n\n'))
    .replace(/\{\s*footer\s*\}/g, footer);

  const finalHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="/import.css">
  <script defer src="/import.js"></script>
  <script defer src="/common.js"></script>
</head>
<body>
  <div data-include-path="/svg-symbols.html"></div>
${shell}
</body>
</html>`;

  return [{
    json: {
      pageName: pageSpec.pageName,
      componentCount: (pageSpec.components || []).length,
      generationMode: pageSpec.generationMode,
      layoutMode: useFormLayout ? 'form' : 'content',
      warnings: pageSpec.warnings || [],
      html: finalHtml,
      outputHtmlPath: pageSpec.outputHtmlPath,
      outputReportPath: pageSpec.outputReportPath,
    },
  }];
};
