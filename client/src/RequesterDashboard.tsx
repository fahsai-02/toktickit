import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.js";
import {
  fetchRequesterDashboard,
  type RequesterDashboard as RequesterDashboardData,
  type DashboardTicketRow,
  ApiError,
} from "./api.js";
import Button from "./components/Button.js";
import ListState from "./components/ListState.js";
import {
  DashboardListCard,
  DashboardTicketListLink,
} from "./components/DashboardList.js";

interface MetricCardProps {
  to: string;
  label: string;
  value: number;
  variant?: "plain" | "attention";
  testId?: string;
}

function MetricCard({
  to,
  label,
  value,
  variant = "plain",
  testId = "metric-card",
}: MetricCardProps) {
  return (
    <Link
      to={to}
      className={`metric-card metric-card--${variant}`}
      data-testid={testId}
      aria-label={`${label}: ${value}. View all`}
    >
      <span className="metric-card__value">{value}</span>
      <span className="metric-card__label">{label}</span>
    </Link>
  );
}

export default function RequesterDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<RequesterDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const result = await fetchRequesterDashboard();
      setData(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred while loading dashboard.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (!user) return null;

  const firstName = user.name ? user.name.split(" ")[0] : "there";

  if (loading) {
    return (
      <div className="container dashboard-container" data-testid="requester-dashboard">
        <div className="dashboard-header">
          <h1 className="page-title">My Tickets</h1>
          <p className="dashboard-greeting">Welcome, {firstName}!</p>
        </div>
        <ListState testId="dashboard-loading" loading message="Loading dashboard..." />
      </div>
    );
  }

  if (errorMessage || !data) {
    return (
      <div className="container dashboard-container" data-testid="requester-dashboard">
        <div className="dashboard-header">
          <h1 className="page-title">My Tickets</h1>
          <p className="dashboard-greeting">Welcome, {firstName}!</p>
        </div>
        <ListState
          testId="dashboard-error"
          variant="error"
          message={errorMessage || "Failed to load dashboard"}
        >
          <Button variant="secondary" onClick={loadDashboard}>
            Retry
          </Button>
        </ListState>
      </div>
    );
  }

  const { counts, recentTickets, recentlyResolved } = data;
  const isZeroActivity =
    counts.open === 0 &&
    counts.inProgress === 0 &&
    counts.waitingForRequester === 0 &&
    counts.resolved === 0 &&
    counts.closed === 0 &&
    counts.attentionRequired === 0;

  return (
    <div className="container dashboard-container" data-testid="requester-dashboard">
      <div className="dashboard-header">
        <h1 className="page-title">My Tickets</h1>
        <p className="dashboard-greeting">Welcome, {firstName}!</p>
      </div>

      {/* 5 Status Cards */}
      <section className="dashboard-grid" aria-label="Status metrics">
        <MetricCard
          to="/my-tickets?statusGroup=open"
          label="Open"
          value={counts.open}
          testId="metric-card-open"
        />
        <MetricCard
          to="/my-tickets?currentStatus=IN_PROGRESS"
          label="In Progress"
          value={counts.inProgress}
          testId="metric-card-in-progress"
        />
        <MetricCard
          to="/my-tickets?currentStatus=WAITING_FOR_REQUESTER"
          label="Waiting for You"
          value={counts.waitingForRequester}
          testId="metric-card-waiting"
        />
        <MetricCard
          to="/my-tickets?currentStatus=RESOLVED"
          label="Resolved"
          value={counts.resolved}
          testId="metric-card-resolved"
        />
        <MetricCard
          to="/my-tickets?currentStatus=CLOSED"
          label="Closed"
          value={counts.closed}
          testId="metric-card-closed"
        />
      </section>

      {/* Attention banner / full width row + Create Ticket CTA */}
      <section className="dashboard-attention" aria-label="Attention required">
        <MetricCard
          variant="attention"
          to="/my-tickets?statusGroup=attention"
          label="Needs your attention"
          value={counts.attentionRequired}
          testId="metric-card-attention"
        />
        <div className="dashboard-quick-actions">
          <Button
            variant="primary"
            onClick={() => navigate("/create-ticket")}
            data-testid="create-ticket-cta"
          >
            Create Ticket
          </Button>
        </div>
      </section>

      {/* Lists */}
      <section className="dashboard-lists">
        <DashboardListCard
          title="Recently Updated"
          items={recentTickets}
          emptyMessage={
            isZeroActivity
              ? "You have not submitted any tickets yet."
              : "No recently updated tickets."
          }
          emptyTestId="recent-tickets-empty"
          cardTestId="recent-tickets-card"
          listAriaLabel="Recently updated tickets"
          renderItem={(ticket: DashboardTicketRow) => (
            <DashboardTicketListLink
              ticket={ticket}
              to={`/tickets/${ticket.id}`}
              testId={`recent-ticket-${ticket.id}`}
              timeKey="updatedAt"
            />
          )}
        />

        <DashboardListCard
          title="Recently Resolved"
          items={recentlyResolved}
          emptyMessage="No recently resolved tickets."
          emptyTestId="recently-resolved-empty"
          cardTestId="recently-resolved-card"
          listAriaLabel="Recently resolved tickets"
          renderItem={(ticket: DashboardTicketRow) => (
            <DashboardTicketListLink
              ticket={ticket}
              to={`/tickets/${ticket.id}`}
              testId={`resolved-ticket-${ticket.id}`}
              timeKey="updatedAt"
            />
          )}
        />
      </section>
    </div>
  );
}

