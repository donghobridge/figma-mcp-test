import { createDismissableLayer } from '../behaviors/dismissable-layer.js';

/**
 * Mega Menu panel — dismissable layer + focus restore to trigger.
 * Visual: `.gnb__mega` in GNB pattern.
 */
export function createMegaMenu(trigger, panel, options = {}) {
  const { focusSelector = 'a[href], button:not([disabled])' } = options;

  const dismissable = createDismissableLayer(panel, {
    onDismiss: () => close(),
    enabled: () => panel.dataset.state === 'open',
  });

  function close() {
    panel.hidden = true;
    panel.dataset.state = 'closed';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  }

  function open() {
    panel.hidden = false;
    panel.dataset.state = 'open';
    trigger.setAttribute('aria-expanded', 'true');
    dismissable.open();
    panel.querySelector(focusSelector)?.focus();
  }

  function toggle() {
    if (panel.dataset.state === 'open') close();
    else open();
  }

  trigger.addEventListener('click', toggle);

  return {
    open,
    close,
    toggle,
    destroy() {
      dismissable.destroy();
    },
  };
}
