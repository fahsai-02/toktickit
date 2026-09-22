// Toggle switch (ui-spec.md section 8: "Toggle (new for Lab 3)"). ui-spec
// section 7 requires `role="switch"` + `aria-checked` for toggle switches.

interface ToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  testId?: string;
}

export default function Toggle({
  id,
  label,
  checked,
  onChange,
  disabled = false,
  testId,
}: ToggleProps) {
  const labelId = `${id}-label`;
  return (
    <div className="toggle-field">
      <span id={labelId} className="field-label">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`toggle${checked ? " toggle--on" : ""}`}
        data-testid={testId ?? id}
      >
        <span className="toggle-thumb" aria-hidden="true" />
      </button>
    </div>
  );
}