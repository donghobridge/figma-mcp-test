import { createDismissableLayer } from '../behaviors/dismissable-layer.js';
import { createRovingFocus } from '../behaviors/roving-focus.js';

/**
 * Dropdown Menu — dismissable layer + roving focus + ARIA menu contract.
 */
export function createDropdownMenu(trigger, menu, options = {}) {
  const {
    itemSelector = '[role="menuitem"]',
    orientation = 'vertical',
    onSelect,
  } = options;

  const dismissable = createDismissableLayer(menu, {
    onDismiss: () => close(),
    enabled: () => menu.dataset.state === 'open',
  });

  const roving = createRovingFocus(menu, { itemSelector, orientation });

  function getItems() {
    return Array.from(menu.querySelectorAll(itemSelector)).filter(
      (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true',
    );
  }

  function open() {
    menu.hidden = false;
    menu.dataset.state = 'open';
    trigger.setAttribute('aria-expanded', 'true');
    dismissable.open();
    const items = getItems();
    items[0]?.focus();
  }

  function close() {
    menu.dataset.state = 'closed';
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  }

  function toggle() {
    if (menu.dataset.state === 'open') close();
    else open();
  }

  trigger.addEventListener('click', toggle);

  menu.addEventListener('click', (event) => {
    const item = event.target.closest(itemSelector);
    if (!item || !menu.contains(item)) return;
    onSelect?.(item);
    close();
  });

  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  });

  return {
    open,
    close,
    toggle,
    destroy() {
      trigger.removeEventListener('click', toggle);
      roving.destroy();
      dismissable.destroy();
    },
  };
}
