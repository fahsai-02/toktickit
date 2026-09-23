import { type ReactNode, useEffect, useRef } from "react";
import { lockScroll, unlockScroll } from "../lib/scrollLock.js";

// Right-side overlay drawer (ui-spec.md section 8: "Drawer (right-side
// overlay, new for Lab 3)"). ui-spec section 7 rules: closes on Escape,
// traps focus, and returns focus to the trigger when closed. While a child
// modal (e.g. ConfirmDialog) is open on top, the drawer stands down
// (`suspended`) so Escape closes only the topmost layer and the (refcounted)
// scroll lock is not released early.

interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** When a modal on top owns Escape + scroll-lock, the drawer suspends. */
  suspended?: boolean;
  testId?: string;
}

export default function Drawer({
  open,
  title,
  onClose,
  children,
  suspended = false,
  testId = "drawer",
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  // Latest onClose without putting it in the effect deps: consumers pass a
  // fresh function every render, and re-running the effect on each keystroke
  // would yank focus away from the field being typed in.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // Render-time ref lets the effect's cleanup distinguish a full close from a
  // suspend, so a suspend never restores focus or drops the captured trigger.
  const suspendedRef = useRef(suspended);
  suspendedRef.current = suspended;
  // Trigger focus is captured once per full open and kept across a
  // suspend/resume cycle so the drawer returns focus to its trigger on close.
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || suspended) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    lockScroll();
    previousFocusRef.current ??= document.activeElement as HTMLElement;

    // ui-spec section 7: dialogs close on Escape and return focus to trigger.
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = drawer.querySelectorAll<HTMLElement>(focusableSelector);
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];
    // Move focus into the drawer so keyboard users land on the close button.
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      // Trap Tab so keyboard focus never leaves the drawer (ui-spec section 7).
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      unlockScroll();
      // A suspend keeps the captured trigger (open stays true, only the
      // suspended flag flips); a full close restores and forgets it.
      if (!suspendedRef.current) {
        previousFocusRef.current?.focus();
        previousFocusRef.current = null;
      }
    };
  }, [open, suspended]);

  if (!open) return null;

  return (
    <div
      className="drawer-overlay"
      data-testid={`${testId}-overlay`}
      onClick={(e) => {
        // Closing on the dark backdrop only — clicks inside the panel (target
        // is a drawer child, not the overlay) never close it.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${testId}-title`}
        ref={drawerRef}
        data-testid={testId}
      >
        <div className="drawer-header">
          <h2 id={`${testId}-title`} className="drawer-title">
            {title}
          </h2>
          <button
            type="button"
            className="drawer-close"
            onClick={onClose}
            aria-label="Close drawer"
            data-testid="drawer-close"
          >
            ×
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  );
}