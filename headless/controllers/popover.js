import { createDismissableLayer } from '../behaviors/dismissable-layer.js';

/**
 * Popover — trigger + dismissable interactive layer.
 */
export function createPopover(trigger, popover, options = {}) {
  const { placement = 'bottom' } = options;

  popover.dataset.placement = placement;

  const dismissable = createDismissableLayer(popover, {
    onDismiss: () => close(),
    enabled: () => popover.dataset.state === 'open',
  });

  function open() {
    popover.hidden = false;
    popover.dataset.state = 'open';
    trigger.setAttribute('aria-expanded', 'true');
    dismissable.open();
    popover.querySelector('.popover__close, [data-popover-close]')?.focus?.();
  }

  function close() {
    popover.dataset.state = 'closed';
    popover.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  }

  function toggle() {
    if (popover.dataset.state === 'open') close();
    else open();
  }

  trigger.addEventListener('click', toggle);

  popover.querySelectorAll('[data-popover-close]').forEach((el) => {
    el.addEventListener('click', close);
  });

  return {
    open,
    close,
    toggle,
    destroy() {
      trigger.removeEventListener('click', toggle);
      dismissable.destroy();
    },
  };
}
