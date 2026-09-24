import { type ReactNode, useEffect, useRef } from "react";
import Button from "./Button.js";
import { lockScroll, unlockScroll } from "../lib/scrollLock.js";

// Reusable confirmation dialog (ui-spec.md section 8 "ConfirmDialog").
// ui-spec section 7 rules: traps focus, closes on Escape, returns focus to the
// trigger. Same pattern as AttachmentSection's remove dialog and
// StaffTicketDetail's status-confirm dialog. The scroll lock is refcounted so
// nesting inside an open Drawer never unlocks the page early.

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  testId?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  testId = "confirm-dialog",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Latest onCancel without putting it in the effect deps — see Drawer.tsx.
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement;
    const dialog = dialogRef.current;
    if (!dialog) return;

    lockScroll();

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = dialog.querySelectorAll<HTMLElement>(focusableSelector);
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancelRef.current();
        return;
      }
      if (e.key !== "Tab") return;

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
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="remove-dialog-overlay confirm-dialog-overlay" data-testid={testId}>
      <div
        className="remove-dialog confirm-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <h3 id="confirm-dialog-title">{title}</h3>
        {children}
        <div className="remove-dialog-actions confirm-dialog-actions">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
            data-testid="confirm-cancel-btn"
          >
            {cancelLabel}
          </Button>
          <Button
            className={destructive ? "btn-destructive" : ""}
            onClick={onConfirm}
            loading={loading}
            data-testid="confirm-ok-btn"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}