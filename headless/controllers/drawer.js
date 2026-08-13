import { createDialog } from './dialog.js';

/**
 * Drawer / Sheet — reuses dialog controller on <dialog class="drawer">.
 */
export function createDrawer(drawerEl, options = {}) {
  return createDialog(drawerEl, {
    panelSelector: '.drawer__panel',
    ...options,
  });
}
