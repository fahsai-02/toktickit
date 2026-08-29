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
        aria-describedby={errorId}
        {...rest}
      />
      {counter && (
        <div className="field-counter" data-testid="field-counter">
          {counter.value}/{counter.max}
        </div>
      )}
      {error && (
        <p id={errorId} className="field-error-msg">
          {error}
        </p>
      )}
    </div>
  );
}
