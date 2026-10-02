import type { ReactNode } from "react";

interface ReadOnlyFieldProps {
  id: string;
  label: string;
  value?: string;
  children?: ReactNode;
  className?: string;
  testId?: string;
}

/**
 * Read-only field shared by the create form and ticket detail screens.
 * Pass `value` for plain text or `children` for rich content (e.g. a badge).
 */
export default function ReadOnlyField({
  id,
  label,
  value,
  children,
  className,
  testId,
}: ReadOnlyFieldProps) {
  return (
    <div className="field-group">
      <span className="field-label">{label}</span>
      <div
        id={id}
        className={`field-readonly ${className ?? ""}`.trim()}
        data-testid={testId}
      >
        {children ?? value}
      </div>
    </div>
  );
}