import type { ReactNode } from "react";
import Spinner from "./Spinner.js";

interface ListStateProps {
  testId: string;
  variant?: "default" | "error";
  loading?: boolean;
  icon?: ReactNode;
  message?: ReactNode;
  children?: ReactNode;
}

/**
 * Shared "list state" block used by the ticket list screens (and detail
 * pages): loading spinner, empty / no-results message with optional icon,
 * and error banner with retry actions. Keeps the `list-state` markup in one
 * place instead of duplicating it on every screen.
 */
export default function ListState({
  testId,
  variant = "default",
  loading = false,
  icon,
  message,
  children,
}: ListStateProps) {
  return (
    <div
      className={`list-state ${variant === "error" ? "list-state--error" : ""}`.trim()}
      data-testid={testId}
    >
      {loading && <Spinner />}
      {icon}
      {message && (typeof message === "string" ? <p>{message}</p> : message)}
      {children}
    </div>
  );
}