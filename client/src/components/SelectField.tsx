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
}

export default function SelectField({
  label,
  required = false,
  options,
  placeholder,
  id,
  className = "",
  ...rest
}: SelectFieldProps) {
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
      <select id={id} className="field-select" {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
