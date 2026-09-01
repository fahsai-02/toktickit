import type { TicketListItem } from "../api.js";
import Badge, { statusBadgeVariant, priorityBadgeVariant } from "./Badge.js";

interface TicketCardProps {
  ticket: TicketListItem;
  onClick: (ticket: TicketListItem) => void;
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
