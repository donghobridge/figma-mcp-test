/**
 * Single selection — Menu, Listbox, Tab manual activation.
 */
export function bindSingleSelection(container, options = {}) {
  const {
    itemSelector = '[role="menuitem"], [role="option"], [role="tab"]',
    selectedAttribute = 'aria-selected',
    onSelect,
  } = options;

  function getItems() {
    return Array.from(container.querySelectorAll(itemSelector)).filter(
      (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true',
    );
  }

  function selectItem(item) {
    getItems().forEach((el) => {
      const isSelected = el === item;
      el.setAttribute(selectedAttribute, String(isSelected));
      el.dataset.state = isSelected ? 'selected' : 'idle';
    });
    onSelect?.(item);
  }

  function handleClick(event) {
    const item = event.target.closest(itemSelector);
    if (!item || !container.contains(item)) return;
    selectItem(item);
  }

  function handleKeydown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const item = event.target.closest(itemSelector);
    if (!item || !container.contains(item)) return;
    event.preventDefault();
    selectItem(item);
  }

  container.addEventListener('click', handleClick);
  container.addEventListener('keydown', handleKeydown);

  return {
    selectItem,
    destroy() {
      container.removeEventListener('click', handleClick);
      container.removeEventListener('keydown', handleKeydown);
    },
  };
}
