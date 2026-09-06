import { type SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  required?: boolean;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

export default function SelectField({
  label,
  required = false,
  options,
  placeholder,
  error,
  id,
  className = "",
  ...rest
}: SelectFieldProps) {
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
      <select
        id={id}
        className={`field-select ${error ? "field-select-error" : ""}`.trim()}
        {...rest}
        required={required}
        aria-required={required ? "true" : undefined}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={errorId}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="field-error-msg">
          {error}
        </p>
      )}
    </div>
  );
}
