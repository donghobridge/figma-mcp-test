/**
 * Web Pattern wiring — reuses headless controllers only.
 * Used by pattern demos and integration pages.
 */
import { createDrawer } from '/headless/controllers/drawer.js';
import { createDropdownMenu } from '/headless/controllers/menu.js';
import { createMegaMenu } from '/headless/controllers/mega-menu.js';
import { bindDisclosure } from '/headless/behaviors/disclosure.js';

export function initSiteNavigation(root = document) {
  const mobileTrigger = root.querySelector('[data-mobile-nav-trigger]');
  const mobileDrawer = root.querySelector('[data-mobile-nav-drawer]');

  if (mobileTrigger && mobileDrawer) {
    const drawer = createDrawer(mobileDrawer);
    mobileTrigger.addEventListener('click', () => drawer.open(mobileTrigger));
  }

  root.querySelectorAll('[data-dropdown-trigger]').forEach((trigger) => {
    const menuId = trigger.getAttribute('aria-controls');
    const menu = menuId ? root.querySelector(`#${CSS.escape(menuId)}`) : null;
    if (!menu) return;

    if (menu.classList.contains('gnb__mega')) {
      createMegaMenu(trigger, menu);
      return;
    }

    createDropdownMenu(trigger, menu);
  });

  root.querySelectorAll('[data-lnb-disclosure]').forEach((trigger) => {
    const panelId = trigger.getAttribute('aria-controls');
    const panel = panelId ? root.querySelector(`#${CSS.escape(panelId)}`) : null;
    if (panel) bindDisclosure(trigger, panel, { multiple: true });
  });
}
