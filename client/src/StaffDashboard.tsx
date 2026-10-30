import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext.js";
import {
  fetchStaffDashboard,
  type StaffDashboard as StaffDashboardData,
  type StaffDashboardTicketRow,
  type MyRecentAction,
  ApiError,
} from "./api.js";
import Button from "./components/Button.js";
import Badge, {
  coloredStatusBadgeVariant,
  priorityBadgeVariant,
} from "./components/Badge.js";
import ListState from "./components/ListState.js";
import { formatRelativeTime } from "./lib/format.js";

interface MetricCardProps {
  to: string;
  label: string;
  value: number;
  variant?: "plain" | "attention" | "users";
  testId?: string;
  subtext?: string;
}

function MetricCard({
  to,
  label,
  value,
  variant = "plain",
  testId = "metric-card",
  subtext,
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
      {subtext && <span className="metric-card__subtext">{subtext}</span>}
    </Link>
  );
}

export default function StaffDashboard() {
  const { user } = useAuth();

  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const result = await fetchStaffDashboard();
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

  const firstName = user.name ? user.name.split(" ")[0] : "Staff";

  if (loading) {
    return (
      <div className="container dashboard-container" data-testid="staff-dashboard">
        <div className="dashboard-header">
          <h1 className="page-title">IT Staff Dashboard</h1>
          <p className="dashboard-greeting">Welcome back, {firstName}!</p>
        </div>
        <ListState testId="dashboard-loading" loading message="Loading queue data..." />
      </div>
    );
  }

  if (errorMessage || !data) {
    return (
      <div className="container dashboard-container" data-testid="staff-dashboard">
        <div className="dashboard-header">
          <h1 className="page-title">IT Staff Dashboard</h1>
          <p className="dashboard-greeting">Welcome back, {firstName}!</p>
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

  const {
    counts,
    byItPriority,
    recentTickets,
    urgentTickets,
    myRecentActions,
    userCounts,
  } = data;

  return (
    <div className="container dashboard-container" data-testid="staff-dashboard">
      <div className="dashboard-header">
        <h1 className="page-title">IT Staff Dashboard</h1>
        <p className="dashboard-greeting">Welcome back, {firstName}!</p>
      </div>

      {/* 4 Status Cards */}
      <section className="dashboard-grid dashboard-grid--staff" aria-label="Status queue counts">
        <MetricCard
          to="/staff/queue?currentStatus=NEW"
          label="New"
          value={counts.new}
          testId="metric-card-new"
        />
        <MetricCard
          to="/staff/queue?currentStatus=OPEN"
          label="Open"
          value={counts.open}
          testId="metric-card-open"
        />
        <MetricCard
          to="/staff/queue?currentStatus=IN_PROGRESS"
          label="In Progress"
          value={counts.inProgress}
          testId="metric-card-in-progress"
        />
        <MetricCard
          to="/staff/queue?currentStatus=WAITING_FOR_REQUESTER"
          label="Waiting for Requester"
          value={counts.waitingForRequester}
          testId="metric-card-waiting"
        />
      </section>

      {/* Ownership Cards */}
      <section className="dashboard-ownership" aria-label="Ticket ownership">
        <MetricCard
          to="/staff/queue?ownerId=unassigned"
          label="Unassigned"
          value={counts.unassigned}
          testId="metric-card-unassigned"
        />
        <MetricCard
          to="/staff/queue?ownerId=me"
          label="Assigned to me"
          value={counts.myAssigned}
          testId="metric-card-my-assigned"
        />
      </section>

      {/* By IT Priority Strip */}
      <section className="priority-strip" data-testid="priority-strip" aria-label="By IT Priority breakdown">
        <h2 className="priority-strip__title">By IT Priority</h2>
        <div className="priority-strip__buckets">
          {byItPriority.map((bucket) => {
            const label = bucket.itPriority === null ? "Not set" : bucket.itPriority;
            const to =
              bucket.itPriority === null
                ? "/staff/queue"
                : `/staff/queue?itPriority=${bucket.itPriority}`;
            const testId = `priority-bucket-${bucket.itPriority === null ? "null" : bucket.itPriority.toLowerCase()}`;
            return (
              <Link
                key={label}
                to={to}
                className="priority-strip__item"
                data-testid={testId}
                aria-label={`${label} priority: ${bucket.count}`}
              >
                <span className="priority-strip__label">{label}</span>
                <span className="priority-strip__count">{bucket.count}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Urgent list */}
      <section className="dashboard-urgent-section" data-testid="urgent-section">
        <div className="dashboard-urgent-header">
          <div className="dashboard-urgent-title-group">
            <h2 className="dashboard-list-title">
              Urgent ({counts.urgentTickets})
            </h2>
          </div>
          <div className="dashboard-urgent-links">
            <Link
              to="/staff/queue?itPriority=URGENT"
              className="dashboard-filter-link"
              data-testid="urgent-link-it-priority"
            >
              By IT Priority
            </Link>
            <Link
              to="/staff/queue?requestedPriority=URGENT"
              className="dashboard-filter-link"
              data-testid="urgent-link-req-priority"
            >
              By Requested Priority
            </Link>
          </div>
        </div>

        {urgentTickets.length === 0 ? (
          <ListState
            testId="urgent-tickets-empty"
            message="No urgent tickets currently in queue."
          />
        ) : (
          <ul className="dashboard-list" aria-label="Urgent tickets">
            {urgentTickets.map((ticket: StaffDashboardTicketRow) => (
              <li key={ticket.id} className="dashboard-list-item">
                <Link
                  to={`/staff/tickets/${ticket.id}`}
                  className="dashboard-list-link"
                  data-testid={`urgent-ticket-${ticket.id}`}
                >
                  <div className="dashboard-list-info">
                    <span className="dashboard-ticket-number">
                      {ticket.ticketNumber}
                    </span>
                    <span className="dashboard-ticket-summary">
                      {ticket.summary}
                    </span>
                  </div>
                  <div className="dashboard-list-meta">
                    <Badge variant={coloredStatusBadgeVariant(ticket.currentStatus)}>
                      {ticket.currentStatus}
                    </Badge>
                    {ticket.itPriority ? (
                      <Badge variant={priorityBadgeVariant(ticket.itPriority)}>
                        {ticket.itPriority}
                      </Badge>
                    ) : (
                      <Badge variant="neutral">Not set</Badge>
                    )}
                    <span className="dashboard-ticket-owner">
                      {ticket.owner ? ticket.owner.name : "Unassigned"}
                    </span>
                    <time
                      className="dashboard-ticket-time"
                      dateTime={ticket.updatedAt}
                    >
                      {formatRelativeTime(ticket.updatedAt)}
                    </time>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Two columns: Recently Updated | My Recent Actions */}
      <section className="dashboard-lists">
        <div className="dashboard-list-card" data-testid="staff-recent-tickets-card">
          <h2 className="dashboard-list-title">Recently Updated</h2>
          {recentTickets.length === 0 ? (
            <ListState
              testId="staff-recent-tickets-empty"
              message="No recently updated tickets in queue."
            />
          ) : (
            <ul className="dashboard-list" aria-label="Recently updated tickets in queue">
              {recentTickets.map((ticket: StaffDashboardTicketRow) => (
                <li key={ticket.id} className="dashboard-list-item">
                  <Link
                    to={`/staff/tickets/${ticket.id}`}
                    className="dashboard-list-link"
                    data-testid={`staff-recent-ticket-${ticket.id}`}
                  >
                    <div className="dashboard-list-info">
                      <span className="dashboard-ticket-number">
                        {ticket.ticketNumber}
                      </span>
                      <span className="dashboard-ticket-summary">
                        {ticket.summary}
                      </span>
                    </div>
                    <div className="dashboard-list-meta">
                      <Badge variant={coloredStatusBadgeVariant(ticket.currentStatus)}>
                        {ticket.currentStatus}
                      </Badge>
                      <span className="dashboard-ticket-owner">
                        {ticket.owner ? ticket.owner.name : "Unassigned"}
                      </span>
                      <time
                        className="dashboard-ticket-time"
                        dateTime={ticket.updatedAt}
                      >
                        {formatRelativeTime(ticket.updatedAt)}
                      </time>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dashboard-list-card" data-testid="my-recent-actions-card">
          <h2 className="dashboard-list-title">My Recent Actions</h2>
          {myRecentActions.length === 0 ? (
            <ListState
              testId="my-recent-actions-empty"
              message="No recent actions recorded."
            />
          ) : (
            <ul className="dashboard-list" aria-label="My recent actions taken">
              {myRecentActions.map((action: MyRecentAction) => (
                <li key={action.id} className="dashboard-list-item">
                  <Link
                    to={`/staff/tickets/${action.ticketId}`}
                    className="dashboard-list-link"
                    data-testid={`recent-action-${action.id}`}
                  >
                    <div className="dashboard-list-info">
                      <span className="dashboard-ticket-number">
                        {action.ticketNumber}
                      </span>
                      <span className="dashboard-ticket-summary">
                        {action.description}
                      </span>
                    </div>
                    <div className="dashboard-list-meta">
                      {action.result && (
                        <span className="dashboard-action-result">
                          {action.result}
                        </span>
                      )}
                      <time
                        className="dashboard-ticket-time"
                        dateTime={action.actionDate}
                      >
                        {formatRelativeTime(action.actionDate)}
                      </time>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Administrator Users Management Card (FR-15, UI-27) */}
      {userCounts && (
        <section className="dashboard-admin-section" data-testid="admin-users-section">
          <h2 className="dashboard-list-title">User Administration</h2>
          <MetricCard
            to="/admin/users"
            label="Total Users"
            value={userCounts.total}
            variant="users"
            testId="metric-card-users"
            subtext={`${userCounts.active} active · ${userCounts.inactive} inactive`}
          />
        </section>
      )}
    </div>
  );
}

