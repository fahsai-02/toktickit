import { type TextareaHTMLAttributes } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  required?: boolean;
  error?: string;
  errorTestId?: string;
  // warnAt: optional threshold (in characters) at which the counter turns the
  // warning color; the counter turns the error color once value exceeds max.
  counter?: { value: number; max: number; warnAt?: number };
}

export default function TextArea({
  label,
  required = false,
  error,
  errorTestId,
  counter,
  id,
  className = "",
  ...rest
}: TextAreaProps) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`field-group ${className}`.trim()}>
      <label htmlFor={id} className="field-label">
        {label}
        {required && (
          <span className="required" aria-label="required">
            *
          </span>
        )}
      </label>
      <textarea
        id={id}
        className={`field-textarea ${error ? "field-error" : ""}`.trim()}
        aria-invalid={error ? "true" : undefined}
        aria-required={required ? "true" : undefined}
        aria-describedby={errorId}
        required={required}
        {...rest}
      />
      {(counter || error) && (
        <div className="field-footer">
          {error && (
            <p id={errorId} className="field-error-msg" data-testid={errorTestId}>
              {error}
            </p>
          )}
          {counter && (
            <span
              className={[
                "field-counter",
                counter.value > counter.max
                  ? "field-counter-error"
                  : counter.warnAt !== undefined && counter.value >= counter.warnAt
                    ? "field-counter-warn"
                    : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-testid={`field-counter-${id}`}
            >
              {counter.value}/{counter.max}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
