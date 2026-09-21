import { Link } from "react-router-dom";

/**
 * Placeholder for the IT Staff Ticket Detail screen. The full claim /
 * reassign / priority / status / comments / notes workflow arrives in a
 * later issue; until then a row click lands here instead of bouncing back
 * to the queue (Issue 19 — no "loaded then bounced" navigation).
 */
export default function StaffTicketDetail() {
  return (
    <div className="container" data-testid="staff-detail-placeholder">
      <Link to="/staff/queue" className="back-link">
        {"\u2190"} My Queue
      </Link>
      <div className="ticket-detail-header">
        <h1 className="ticket-detail-number">Ticket Detail</h1>
      </div>
      <div className="ticket-detail-card">
        <p>
          The IT Staff ticket detail screen — claim, reassign, IT priority,
          status changes, public comments, and internal notes — arrives in a
          later issue.
        </p>
        <p>
          Use the &ldquo;My Queue&rdquo; link above to return to the ticket
          list.
        </p>
      </div>
    </div>
  );
}