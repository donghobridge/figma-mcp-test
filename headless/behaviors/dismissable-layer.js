import { bindEscape } from './escape.js';
import { bindOutsideInteraction } from './outside-interaction.js';

/**
 * Dismissable layer — composes Escape + outside interaction.
 * Visual layer consumes data-state="open|closed".
 */
export function createDismissableLayer(container, options = {}) {
  const {
    onDismiss,
    closeOnEscape = true,
    closeOnOutside = true,
    enabled = () => true,
  } = options;

  const cleanups = [];

  function dismiss(event) {
    if (!enabled()) return;
    container.dataset.state = 'closed';
    onDismiss?.(event);
  }

  if (closeOnEscape) {
    cleanups.push(bindEscape(container, dismiss, { enabled }));
  }

  if (closeOnOutside) {
    cleanups.push(bindOutsideInteraction(container, dismiss, { enabled }));
  }

  return {
    open() {
      container.dataset.state = 'open';
    },
    close: dismiss,
    destroy() {
      cleanups.forEach((cleanup) => cleanup());
    },
  };
}
