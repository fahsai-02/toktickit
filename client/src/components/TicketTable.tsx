import type {
  RequestedPriority,
  TicketStatus,
  Category,
} from "../api.js";
import Badge, {
  coloredStatusBadgeVariant,
  priorityBadgeVariant,
} from "./Badge.js";
import { formatDate } from "../lib/format.js";

interface SortConfig {
  sortBy: string;
  sortOrder: "asc" | "desc";
}

/**
 * One row shape shared by both screens. The requester list sends
 * `TicketListItem`s; the staff queue sends `StaffTicketListItem`s, which add
 * `owner` (nullable). `owner` is optional here so either array is assignable.
 */
export interface TicketRow {
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: RequestedPriority;
  itPriority: RequestedPriority | null;
  currentStatus: TicketStatus;
  category: Category;
  createdAt: string;
  updatedAt: string;
  owner?: { id: number; name: string } | null;
}

type Variant = "requester" | "staff";

interface TicketTableProps {
  tickets: TicketRow[];
  sort: SortConfig;
  onSort: (field: string) => void;
  onRowClick: (ticket: TicketRow) => void;
  variant?: Variant;
}

// api-spec section 5.1 whitelist — the staff queue may only sort these 5
// fields. There is intentionally no `requestedPriority` entry (the server
// rejects that sort with a 400). Requesters may sort their own columns too.
const SORTABLE_FIELDS: Record<Variant, string[]> = {
  requester: ["ticketNumber", "updatedAt", "createdAt", "requestedPriority"],
  staff: ["ticketNumber", "updatedAt", "createdAt", "itPriority", "currentStatus"],
};

const HEADERS: Record<Variant, Array<{ key: string; label: string }>> = {
  requester: [
    { key: "ticketNumber", label: "Ticket Number" },
    { key: "summary", label: "Summary" },
    { key: "category", label: "Category" },
    { key: "requestedPriority", label: "Requested Priority" },
    { key: "itPriority", label: "IT Priority" },
    { key: "currentStatus", label: "Current Status" },
    { key: "updatedAt", label: "Last Updated" },
  ],
  staff: [
    { key: "ticketNumber", label: "Ticket No." },
    { key: "createdAt", label: "Created Date" },
    { key: "summary", label: "Summary" },
    { key: "category", label: "Category" },
    { key: "requestedPriority", label: "Req. Priority" },
    { key: "itPriority", label: "IT Priority" },
    { key: "currentStatus", label: "Status" },
    { key: "owner", label: "Owner" },
    { key: "updatedAt", label: "Last Updated" },
  ],
};

// Date columns collapse together at tablet width. The class must land on the
// `th` too, otherwise the header keeps 9 columns while rows drop 2 cells and
// the data no longer lines up under its columns.
const TABLET_HIDDEN: Record<Variant, string[]> = {
  requester: [],
  staff: ["createdAt", "updatedAt"],
};

function SortArrow({
  field,
  sort,
  sortable,
}: {
  field: string;
  sort: SortConfig;
  sortable: string[];
}) {
  if (!sortable.includes(field)) {
    return null;
  }
  const active = sort.sortBy === field;
  return (
    <span className="sort-arrow" aria-hidden="true">
      {active ? (sort.sortOrder === "asc" ? " \u25B2" : " \u25BC") : " \u25B4"}
    </span>
  );
}

export default function TicketTable({
  tickets,
  sort,
  onSort,
  onRowClick,
  variant = "requester",
}: TicketTableProps) {
  const isStaff = variant === "staff";
  const sortable = SORTABLE_FIELDS[variant];
  const headers = HEADERS[variant];
  const hidden = TABLET_HIDDEN[variant];

  return (
    <div className="ticket-table-wrap">
      <table
        className="ticket-table"
        data-testid={isStaff ? "staff-table" : "ticket-table"}
      >
        <thead>
          <tr>
            {headers.map(({ key, label }) => {
              const isSortable = sortable.includes(key);
              const hideAtTablet = hidden.includes(key);
              return (
                <th
                  key={key}
                  className={`${isSortable ? "sortable-th" : ""} ${
                    hideAtTablet ? "staff-col-date" : ""
                  }`.trim()}
                  onClick={isSortable ? () => onSort(key) : undefined}
                  scope="col"
                  data-testid={isStaff ? `staff-th-${key}` : undefined}
                >
                  {label}
                  <SortArrow field={key} sort={sort} sortable={sortable} />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr
              key={t.id}
              className="ticket-row"
              onClick={() => onRowClick(t)}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRowClick(t);
                }
              }}
              data-testid={
                isStaff ? `staff-ticket-row-${t.id}` : `ticket-row-${t.id}`
              }
            >
              <td className="col-ticket-number">{t.ticketNumber}</td>
              {isStaff && <td className="staff-col-date">{formatDate(t.createdAt)}</td>}
              <td className={isStaff ? "col-summary staff-col-summary" : "col-summary"}>
                {isStaff ? (
                  <span className="ticket-summary-clamp">{t.summary}</span>
                ) : (
                  t.summary
                )}
              </td>
              <td>{t.category.name}</td>
              <td>
                <Badge variant={priorityBadgeVariant(t.requestedPriority)}>
                  {t.requestedPriority}
                </Badge>
              </td>
              <td>
                {t.itPriority ? (
                  <Badge variant={priorityBadgeVariant(t.itPriority)}>
                    {t.itPriority}
                  </Badge>
                ) : (
                  <Badge variant="neutral">{"\u2014"}</Badge>
                )}
              </td>
              <td>
                <Badge variant={coloredStatusBadgeVariant(t.currentStatus)}>
                  {t.currentStatus}
                </Badge>
              </td>
              {isStaff && (
                <td>
                  <span
                    className={`col-owner ${
                      t.owner ? "" : "col-owner--unassigned"
                    }`}
                  >
                    {t.owner ? t.owner.name : "Unassigned"}
                  </span>
                </td>
              )}
              <td className={isStaff ? "staff-col-date" : ""}>
                {formatDate(t.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}