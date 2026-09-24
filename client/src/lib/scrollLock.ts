// Refcounted body scroll lock for stacked overlays (ui-spec section 7: modal
// dialogs lock page scroll while open). A ConfirmDialog mounted on top of a
// Drawer must not let the underlying overlay's cleanup re-enable scrolling
// early, so the lock is counted: only the outermost owner clears it.
let lockCount = 0;

export function lockScroll(): void {
  lockCount += 1;
  document.body.style.overflow = "hidden";
}

export function unlockScroll(): void {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = "";
  }
}