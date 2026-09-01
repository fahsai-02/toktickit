import type { TicketListItem } from "../api.js";
import Badge, {
  statusBadgeVariant,
  priorityBadgeVariant,
} from "./Badge.js";

interface SortConfig {
  sortBy: string;
  sortOrder: "asc" | "desc";
}

interface TicketTableProps {
  tickets: TicketListItem[];
  sort: SortConfig;
  onSort: (field: string) => void;
  onRowClick: (ticket: TicketListItem) => void;
}

const SORTABLE_FIELDS = ["ticketNumber", "updatedAt", "createdAt", "requestedPriority"];

function SortArrow({
  field,
  sort,
}: {
  field: string;
  sort: SortConfig;
}) {
  if (!(SORTABLE_FIELDS as string[]).includes(field)) {
    return null;
  }
  const active = sort.sortBy === field;
  return (
    <span className="sort-arrow" aria-hidden="true">
      {active ? (sort.sortOrder === "asc" ? " \u25B2" : " \u25BC") : " \u25B4"}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TicketTable({
  tickets,
  sort,
  onSort,
  onRowClick,
}: TicketTableProps) {
  return (
    <div className="ticket-table-wrap">
      <table className="ticket-table" data-testid="ticket-table">
        <thead>
          <tr>
            {(
              [
                "ticketNumber",
                "summary",
                "category",
                "requestedPriority",
                "itPriority",
                "currentStatus",
                "updatedAt",
              ] as const
            ).map((key) => {
              const sortable = SORTABLE_FIELDS.includes(key);
              const label =
                key === "updatedAt"
                  ? "Last Updated"
                  : key === "ticketNumber"
                    ? "Ticket Number"
                    : key === "requestedPriority"
                      ? "Requested Priority"
                      : key === "itPriority"
                        ? "IT Priority"
                        : key === "currentStatus"
                          ? "Current Status"
                          : key.charAt(0).toUpperCase() + key.slice(1);
              return (
                <th
                  key={key}
                  className={sortable ? "sortable-th" : ""}
                  onClick={sortable ? () => onSort(key) : undefined}
                  scope="col"
                >
                  {label}
                  <SortArrow field={key} sort={sort} />
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
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRowClick(t);
                }
              }}
              data-testid={`ticket-row-${t.id}`}
            >
              <td className="col-ticket-number">{t.ticketNumber}</td>
              <td className="col-summary">{t.summary}</td>
              <td>{t.category.name}</td>
              <td>
                <Badge variant={priorityBadgeVariant(t.requestedPriority)}>
                  {t.requestedPriority}
                </Badge>
              </td>
              <td>
                <Badge variant="it-priority">{t.itPriority ?? "\u2014"}</Badge>
              </td>
              <td>
                <Badge variant={statusBadgeVariant(t.currentStatus)}>
                  {t.currentStatus}
                </Badge>
              </td>
              <td>{formatDate(t.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
