import { type ReactNode, useEffect, useRef } from "react";

// Right-side overlay drawer (ui-spec.md section 8: "Drawer (right-side
// overlay, new for Lab 3)"). ui-spec section 7 rules: closes on Escape,
// traps focus, and returns focus to the trigger when closed.

interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
}

export default function Drawer({
  open,
  title,
  onClose,
  children,
  testId = "drawer",
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  // Latest onClose without putting it in the effect deps: consumers pass a
  // fresh function every render, and re-running the effect on each keystroke
  // would yank focus away from the field being typed in.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement;
    const drawer = drawerRef.current;
    if (!drawer) return;

    document.body.style.overflow = "hidden";

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
      document.body.style.overflow = "";
      previousFocus?.focus();
    };
  }, [open]);

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