import { type TextareaHTMLAttributes } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  required?: boolean;
  error?: string;
  counter?: { value: number; max: number };
}

export default function TextArea({
  label,
  required = false,
  error,
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
            <p id={errorId} className="field-error-msg">
              {error}
            </p>
          )}
          {counter && (
            <span className="field-counter" data-testid={`field-counter-${id}`}>
              {counter.value}/{counter.max}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
