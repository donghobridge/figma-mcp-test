/**
 * Escape key handler — shared behavior primitive.
 * Used by Dialog, Popover, Menu, Select overlays.
 */
export function bindEscape(container, onEscape, options = {}) {
  const { enabled = () => true } = options;

  function handleKeydown(event) {
    if (event.key !== 'Escape') return;
    if (!enabled()) return;
    onEscape(event);
  }

  container.addEventListener('keydown', handleKeydown);

  return () => {
    container.removeEventListener('keydown', handleKeydown);
  };
}
