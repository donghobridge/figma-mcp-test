/**
 * Outside interaction handler — shared behavior primitive.
 */
export function bindOutsideInteraction(container, onOutside, options = {}) {
  const { enabled = () => true } = options;

  function handlePointerDown(event) {
    if (!enabled()) return;
    if (container.contains(event.target)) return;
    onOutside(event);
  }

  document.addEventListener('pointerdown', handlePointerDown, true);

  return () => {
    document.removeEventListener('pointerdown', handlePointerDown, true);
  };
}
