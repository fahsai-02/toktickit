import type { TicketListItem } from "../api.js";
import Badge, { statusBadgeVariant, priorityBadgeVariant } from "./Badge.js";
import { formatDate } from "../lib/format.js";

interface TicketCardProps {
  ticket: TicketListItem;
  onClick: (ticket: TicketListItem) => void;
}

export default function TicketCard({ ticket, onClick }: TicketCardProps) {
  return (
    <button
      type="button"
      className="ticket-card"
      onClick={() => onClick(ticket)}
      data-testid={`ticket-card-${ticket.id}`}
    >
      <div className="ticket-card-header">
        <span className="ticket-card-number">{ticket.ticketNumber}</span>
        <Badge variant={statusBadgeVariant(ticket.currentStatus)}>
          {ticket.currentStatus}
        </Badge>
      </div>
      <p className="ticket-card-summary">{ticket.summary}</p>
      <div className="ticket-card-meta">
        <span>{ticket.category.name}</span>
        <Badge variant={priorityBadgeVariant(ticket.requestedPriority)}>
          {ticket.requestedPriority}
        </Badge>
        <Badge variant="it-priority">{ticket.itPriority ?? "\u2014"}</Badge>
      </div>
      <div className="ticket-card-updated">
        {formatDate(ticket.updatedAt)}
      </div>
    </button>
  );
}
