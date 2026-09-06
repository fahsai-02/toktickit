import { type InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  error?: string;
  counter?: { value: number; max: number };
}

export default function TextField({
  label,
  required = false,
  error,
  counter,
  id,
  className = "",
  ...rest
}: TextFieldProps) {
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
      <input
        id={id}
        className={`field-input ${error ? "field-error" : ""}`.trim()}
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
