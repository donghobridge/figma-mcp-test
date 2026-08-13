import { createRovingFocus } from '../behaviors/roving-focus.js';

/**
 * Tabs — roving focus + aria-selected + panel visibility.
 */
export function createTabs(root, options = {}) {
  const {
    tabListSelector = '[role="tablist"]',
    tabSelector = '[role="tab"]',
    panelSelector = '[role="tabpanel"]',
    activation = 'manual',
  } = options;

  const tabList = root.querySelector(tabListSelector);
  if (!tabList) return null;

  const roving = createRovingFocus(tabList, {
    itemSelector: tabSelector,
    orientation: tabList.getAttribute('aria-orientation') === 'vertical' ? 'vertical' : 'horizontal',
  });

  function getTabs() {
    return Array.from(tabList.querySelectorAll(tabSelector));
  }

  function getPanel(tab) {
    const panelId = tab.getAttribute('aria-controls');
    return panelId ? root.querySelector(`#${CSS.escape(panelId)}`) : null;
  }

  function activateTab(tab, focusTab = true) {
    getTabs().forEach((item) => {
      const isSelected = item === tab;
      item.setAttribute('aria-selected', String(isSelected));
      item.setAttribute('tabindex', isSelected ? '0' : '-1');
      item.dataset.state = isSelected ? 'selected' : 'idle';

      const panel = getPanel(item);
      if (panel) {
        panel.hidden = !isSelected;
        panel.dataset.state = isSelected ? 'open' : 'closed';
      }
    });

    if (focusTab) tab.focus();
  }

  tabList.addEventListener('click', (event) => {
    const tab = event.target.closest(tabSelector);
    if (!tab || !tabList.contains(tab)) return;
    activateTab(tab);
  });

  tabList.addEventListener('keydown', (event) => {
    const tabs = getTabs();
    const current = tabs.find((tab) => tab === document.activeElement);
    if (!current) return;

    if (activation === 'automatic' && (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End')) {
      queueMicrotask(() => activateTab(document.activeElement));
    }

    if (activation === 'manual' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      activateTab(current);
    }
  });

  const initial = getTabs().find((tab) => tab.getAttribute('aria-selected') === 'true') ?? getTabs()[0];
  if (initial) activateTab(initial, false);

  return {
    activateTab,
    destroy() {
      roving.destroy();
    },
  };
}
