import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useRequester } from "./RequesterContext.js";
import {
  fetchTicket,
  type TicketDetail as TicketDetailType,
  type Attachment,
  ApiError,
} from "./api.js";
import Badge, {
  statusBadgeVariant,
  priorityBadgeVariant,
} from "./components/Badge.js";
import ReadOnlyField from "./components/ReadOnlyField.js";
import Spinner from "./components/Spinner.js";
import Button from "./components/Button.js";
import AttachmentSection from "./components/AttachmentSection.js";
import { ArrowLeft } from 'lucide-react';
import { formatDate } from "./lib/format.js";


type DetailState = "loading" | "error" | "not-found" | "access-denied" | "idle";

export default function TicketDetail() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { requester } = useRequester();
  const [ticket, setTicket] = useState<TicketDetailType | null>(null);
  const [state, setState] = useState<DetailState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!requester || !ticketId) return;
    const id = Number(ticketId);
    if (!Number.isFinite(id) || id <= 0) {
      setState("not-found");
      return;
    }

    let cancelled = false;
    setState("loading");
    setErrorMessage("");

    fetchTicket(id, requester.id)
      .then((data) => {
        if (cancelled) return;
        setTicket(data);
        setState("idle");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (err.code === "NOT_FOUND") {
            setState("not-found");
          } else if (err.code === "FORBIDDEN") {
            setState("access-denied");
          } else {
            setErrorMessage(err.message);
            setState("error");
          }
        } else {
          setErrorMessage("An unexpected error occurred.");
          setState("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ticketId, requester]);

  if (state === "loading") {
    return (
      <div className="container ticket-detail">
        <div className="list-state" data-testid="loading-state">
          <Spinner />
          <span>Loading ticket...</span>
        </div>
      </div>
    );
  }

  if (state === "not-found") {
    return (
      <div className="container ticket-detail">
        <Link to="/my-tickets" className="back-link">
          <ArrowLeft size={16} />
          My Tickets
        </Link>
        <div className="list-state" data-testid="not-found-state">
          <p>Ticket not found.</p>
          <Button variant="secondary" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (state === "access-denied") {
    return (
      <div className="container ticket-detail">
        <Link to="/my-tickets" className="back-link">
          <ArrowLeft size={16} />
          My Tickets
        </Link>
        <div className="list-state list-state--error" data-testid="access-denied-state">
          <p>You don&apos;t have access to this ticket.</p>
          <Button variant="secondary" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="container ticket-detail">
        <Link to="/my-tickets" className="back-link">
          <ArrowLeft size={16} />
          My Tickets
        </Link>
        <div className="list-state list-state--error" data-testid="error-state">
          <p className="error-banner">{errorMessage}</p>
          <Button variant="secondary" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const handleAttachmentsUpdate = (newAttachments: Attachment[]) => {
    if (ticket) {
      setTicket({ ...ticket, attachments: newAttachments });
    }
  };

  return (
    <div className="container ticket-detail" data-testid="ticket-detail">
      <Link to="/my-tickets" className="back-link">
        < ArrowLeft size={16}/>
        My Tickets
      </Link>

      <div className="ticket-detail-header">
        <h1 className="ticket-detail-number">{ticket.ticketNumber}</h1>
        <Badge variant={statusBadgeVariant(ticket.currentStatus)}>
          {ticket.currentStatus}
        </Badge>
      </div>

      <div className="ticket-detail-card">
        <div className="ticket-detail-grid">
          <ReadOnlyField id="requester" label="Requester" value={ticket.requester.name} />
          <ReadOnlyField id="category" label="Category" value={ticket.category.name} />
          <ReadOnlyField id="related-system" label="Related System" value={ticket.relatedSystem.name} />
          <div className="field-group">
            <span className="field-label">Requested Priority</span>
            <div className="field-readonly">
              <Badge variant={priorityBadgeVariant(ticket.requestedPriority)}>
                {ticket.requestedPriority}
              </Badge>
            </div>
          </div>
          <div className="field-group">
            <span className="field-label">IT Priority</span>
            <div className="field-readonly">
              <Badge variant="it-priority">&mdash;</Badge>
            </div>
          </div>
          <ReadOnlyField id="ticket-date" label="Ticket Date" value={formatDate(ticket.ticketDate)} />
          <ReadOnlyField id="created" label="Created" value={formatDate(ticket.createdAt)} />
          <ReadOnlyField id="updated" label="Last Updated" value={formatDate(ticket.updatedAt)} />
        </div>

        <div className="field-group">
          <span className="field-label">Summary</span>
          <div className="field-readonly">{ticket.summary}</div>
        </div>

        <div className="field-group">
          <span className="field-label">Description</span>
          <div className="field-readonly ticket-detail-description">
            {ticket.description}
          </div>
        </div>
      </div>

      {/* Attachments */}
      <AttachmentSection
        ticketId={ticket.id}
        requesterId={requester?.id ?? 0}
        attachments={ticket.attachments}
        onUpdate={handleAttachmentsUpdate}
      />

      <p className="text-muted ticket-detail-note">
        Comments, internal notes, and status actions will be available in future updates.
      </p>
    </div>
  );
}
