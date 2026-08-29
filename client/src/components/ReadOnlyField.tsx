interface ReadOnlyFieldProps {
  id: string;
  label: string;
  value: string;
}

export default function ReadOnlyField({ id, label, value }: ReadOnlyFieldProps) {
  return (
    <div className="field-group">
      <span className="field-label">{label}</span>
      <div id={id} className="field-readonly">
        {value}
      </div>
    </div>
  );
}
