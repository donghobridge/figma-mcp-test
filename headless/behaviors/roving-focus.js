/**
 * Roving focus — used by Tabs, Menu, Listbox.
 */
export function createRovingFocus(container, options = {}) {
  const {
    itemSelector = '[role="menuitem"], [role="tab"], [role="option"]',
    orientation = 'horizontal',
  } = options;

  function getItems() {
    return Array.from(container.querySelectorAll(itemSelector)).filter(
      (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true',
    );
  }

  function focusItem(index) {
    const items = getItems();
    if (items.length === 0) return;

    const nextIndex = ((index % items.length) + items.length) % items.length;
    items.forEach((item, i) => {
      item.tabIndex = i === nextIndex ? 0 : -1;
    });
    items[nextIndex].focus();
  }

  function handleKeydown(event) {
    const items = getItems();
    const currentIndex = items.findIndex((item) => item === document.activeElement);
    if (currentIndex < 0) return;

    const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';

    if (event.key === prevKey) {
      event.preventDefault();
      focusItem(currentIndex - 1);
    }

    if (event.key === nextKey) {
      event.preventDefault();
      focusItem(currentIndex + 1);
    }

    if (event.key === 'Home') {
      event.preventDefault();
      focusItem(0);
    }

    if (event.key === 'End') {
      event.preventDefault();
      focusItem(items.length - 1);
    }
  }

  container.addEventListener('keydown', handleKeydown);

  const items = getItems();
  if (items.length > 0) {
    items.forEach((item, i) => {
      item.tabIndex = i === 0 ? 0 : -1;
    });
  }

  return {
    focusItem,
    destroy() {
      container.removeEventListener('keydown', handleKeydown);
    },
  };
}
