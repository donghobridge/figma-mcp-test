let lockCount = 0;
let previousOverflow = '';

/**
 * Scroll lock — shared by Dialog, Drawer, Mobile Navigation.
 */
export function lockScroll() {
  lockCount += 1;
  if (lockCount === 1) {
    previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
  }
}

export function unlockScroll() {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.documentElement.style.overflow = previousOverflow;
  }
}
