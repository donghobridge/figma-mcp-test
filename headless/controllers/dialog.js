import { createFocusTrap } from '../behaviors/focus-trap.js';
import { bindEscape } from '../behaviors/escape.js';
import { lockScroll, unlockScroll } from '../behaviors/scroll-lock.js';

/**
 * Dialog — native <dialog> + focus trap + scroll lock + escape.
 */
export function createDialog(dialogEl, options = {}) {
  const {
    panelSelector = '.dialog__panel',
    closeOnEscape = true,
    restoreFocus = true,
  } = options;

  const panel = dialogEl.querySelector(panelSelector) ?? dialogEl;
  const trap = createFocusTrap(panel, { restoreFocus });
  const cleanups = [];
  let trigger = null;

  function setState(state) {
    dialogEl.dataset.state = state;
  }

  function open(opener) {
    trigger = opener ?? document.activeElement;
    if (typeof dialogEl.showModal === 'function') {
      dialogEl.showModal();
    } else {
      dialogEl.setAttribute('open', '');
    }
    setState('open');
    trap.activate();
    lockScroll();
  }

  function close() {
    if (typeof dialogEl.close === 'function' && dialogEl.open) {
      dialogEl.close();
    } else {
      dialogEl.removeAttribute('open');
    }
    setState('closed');
    trap.deactivate();
    unlockScroll();
    if (restoreFocus && trigger instanceof HTMLElement) {
      trigger.focus();
    }
  }

  if (closeOnEscape) {
    cleanups.push(bindEscape(dialogEl, close, { enabled: () => dialogEl.dataset.state === 'open' }));
  }

  dialogEl.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });

  dialogEl.querySelectorAll('[data-dialog-close]').forEach((el) => {
    el.addEventListener('click', close);
  });

  return {
    open,
    close,
    destroy() {
      cleanups.forEach((cleanup) => cleanup());
    },
  };
}
