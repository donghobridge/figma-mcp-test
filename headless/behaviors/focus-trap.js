const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Focus trap — used by Dialog / Alert Dialog.
 */
export function createFocusTrap(container, options = {}) {
  const { initialFocus, restoreFocus = true } = options;
  let previouslyFocused = null;

  function getFocusableElements() {
    return Array.from(container.querySelectorAll(FOCUSABLE)).filter(
      (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
    );
  }

  function handleKeydown(event) {
    if (event.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return {
    activate() {
      previouslyFocused = document.activeElement;
      container.addEventListener('keydown', handleKeydown);

      const focusable = getFocusableElements();
      const target = initialFocus ?? focusable[0] ?? container;
      target.focus?.();
    },
    deactivate() {
      container.removeEventListener('keydown', handleKeydown);

      if (restoreFocus && previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    },
  };
}
