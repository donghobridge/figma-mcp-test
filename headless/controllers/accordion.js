import { bindDisclosure } from '../behaviors/disclosure.js';

/**
 * Accordion — multiple disclosure triggers with optional single-open group.
 */
export function createAccordion(root, options = {}) {
  const { multiple = false, itemSelector = '.accordion__item' } = options;
  const controllers = [];

  root.querySelectorAll(itemSelector).forEach((item) => {
    const trigger = item.querySelector('.accordion__trigger');
    const panel = item.querySelector('.accordion__panel');
    if (!trigger || !panel) return;

    const id = panel.id || `accordion-panel-${Math.random().toString(36).slice(2, 9)}`;
    panel.id = id;
    trigger.setAttribute('aria-controls', id);

    controllers.push(
      bindDisclosure(trigger, panel, {
        multiple,
        group: multiple ? null : root,
      }),
    );
  });

  return {
    destroy() {
      controllers.length = 0;
    },
  };
}
