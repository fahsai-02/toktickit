export interface MobileSortOption {
  value: string;
  label: string;
}

interface MobileSortSelectProps {
  sortBy: string;
  sortOrder: "asc" | "desc";
  options: MobileSortOption[];
  onChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
  fieldId?: string;
}

/**
 * Mobile-only "Sort by" dropdown shared by every ticket list screen. The
 * wrapper keeps the `mobile-sort` class that switches visibility from
 * `display: none` (desktop) to visible (mobile) in App.css; the value format
 * is the `field:order` string the list screens already read.
 */
export default function MobileSortSelect({
  sortBy,
  sortOrder,
  options,
  onChange,
  fieldId = "mobile-sort-select",
}: MobileSortSelectProps) {
  return (
    <div className="mobile-sort" data-testid="mobile-sort">
      <label htmlFor={fieldId} className="field-label">
        Sort by
      </label>
      <select
        id={fieldId}
        className="field-select"
        value={`${sortBy}:${sortOrder}`}
        onChange={(e) => {
          const [field, order] = e.target.value.split(":");
          onChange(field, order as "asc" | "desc");
        }}
        data-testid="mobile-sort-select"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}