/**
 * Disclosure state — Accordion / Collapsible sections.
 * Prefers native details/summary when markup allows.
 */
export function bindDisclosure(trigger, panel, options = {}) {
  const { multiple = false, group = null } = options;

  function setOpen(isOpen) {
    trigger.setAttribute('aria-expanded', String(isOpen));
    panel.hidden = !isOpen;
    trigger.dataset.state = isOpen ? 'open' : 'closed';
    panel.dataset.state = isOpen ? 'open' : 'closed';
  }

  function toggle() {
    const willOpen = trigger.getAttribute('aria-expanded') !== 'true';

    if (willOpen && !multiple && group) {
      group.querySelectorAll('[aria-expanded="true"]').forEach((openTrigger) => {
        if (openTrigger === trigger) return;
        const targetId = openTrigger.getAttribute('aria-controls');
        const targetPanel = targetId ? document.getElementById(targetId) : null;
        if (targetPanel) {
          openTrigger.setAttribute('aria-expanded', 'false');
          openTrigger.dataset.state = 'closed';
          targetPanel.hidden = true;
          targetPanel.dataset.state = 'closed';
        }
      });
    }

    setOpen(willOpen);
  }

  trigger.addEventListener('click', toggle);

  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle,
  };
}
