import Badge, {
  coloredStatusBadgeVariant,
  priorityBadgeVariant,
} from "./Badge.js";
import { formatDate } from "../lib/format.js";
import type { TicketRow } from "./TicketTable.js";

interface TicketCardProps {
  ticket: TicketRow;
  onClick: (ticket: TicketRow) => void;
  variant?: "requester" | "staff";
}

export default function TicketCard({
  ticket,
  onClick,
  variant = "requester",
}: TicketCardProps) {
  const isStaff = variant === "staff";
  return (
    <button
      type="button"
      className="ticket-card"
      onClick={() => onClick(ticket)}
      data-testid={
        isStaff ? `staff-ticket-card-${ticket.id}` : `ticket-card-${ticket.id}`
      }
    >
      <div className="ticket-card-header">
        <span className="ticket-card-number">{ticket.ticketNumber}</span>
        <Badge variant={coloredStatusBadgeVariant(ticket.currentStatus)}>
          {ticket.currentStatus}
        </Badge>
      </div>
      <p className="ticket-card-summary">{ticket.summary}</p>
      <div className="ticket-card-meta">
        <span>{ticket.category.name}</span>
        <Badge variant={priorityBadgeVariant(ticket.requestedPriority)}>
          {ticket.requestedPriority}
        </Badge>
        {ticket.itPriority ? (
          <Badge variant={priorityBadgeVariant(ticket.itPriority)}>
            {ticket.itPriority}
          </Badge>
        ) : (
          <Badge variant="neutral">{"\u2014"}</Badge>
        )}
      </div>
      <div className="ticket-card-updated">
        {isStaff && (
          <span>{ticket.owner ? ticket.owner.name : "Unassigned"}</span>
        )}
        {isStaff ? " \u00B7 " : ""}
        {formatDate(ticket.updatedAt)}
      </div>
    </button>
  );
}