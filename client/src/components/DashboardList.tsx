import { Link } from "react-router-dom";
import Badge, { coloredStatusBadgeVariant, priorityBadgeVariant } from "./Badge.js";
import ListState from "./ListState.js";
import { formatRelativeTime } from "../lib/format.js";

export interface DashboardListItemBase {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: string;
  updatedAt?: string;
  actionDate?: string;
}

export interface DashboardTicketListItem extends DashboardListItemBase {
  itPriority?: string | null;
  owner?: { id: number; name: string } | null;
}

export interface DashboardActionListItem {
  id: number;
  ticketId: number;
  ticketNumber: string;
  description: string;
  result?: string | null;
  actionDate: string;
}

interface DashboardListCardProps<T extends { id: number }> {
  title: string;
  items: T[];
  emptyMessage: string;
  emptyTestId?: string;
  cardTestId?: string;
  listAriaLabel?: string;
  /** Optional call to action rendered inside the empty block (ui-spec 5.1). */
  emptyAction?: React.ReactNode;
  renderItem: (item: T) => React.ReactNode;
}

export function DashboardListCard<T extends { id: number }>({
  title,
  items,
  emptyMessage,
  emptyTestId = "dashboard-list-empty",
  cardTestId,
  listAriaLabel,
  emptyAction,
  renderItem,
}: DashboardListCardProps<T>) {
  return (
    <div className="dashboard-list-card" data-testid={cardTestId}>
      <h2 className="dashboard-list-title">{title}</h2>
      {items.length === 0 ? (
        <ListState testId={emptyTestId} message={emptyMessage}>
          {emptyAction}
        </ListState>
      ) : (
        <ul className="dashboard-list" aria-label={listAriaLabel}>
          {items.map((item) => (
            <li key={item.id} className="dashboard-list-item">
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface DashboardTicketListLinkProps {
  ticket: DashboardTicketListItem;
  to: string;
  testId?: string;
  showOwner?: boolean;
  showPriority?: boolean;
  timeKey?: "updatedAt" | "actionDate";
}

export function DashboardTicketListLink({
  ticket,
  to,
  testId,
  showOwner = false,
  showPriority = false,
  timeKey = "updatedAt",
}: DashboardTicketListLinkProps) {
  const time = timeKey === "actionDate" && (ticket as any).actionDate ? (ticket as any).actionDate : ticket.updatedAt;

  return (
    <Link to={to} className="dashboard-list-link" data-testid={testId}>
      <div className="dashboard-list-info">
        <span className="dashboard-ticket-number">{ticket.ticketNumber}</span>
        <span className="dashboard-ticket-summary">{ticket.summary}</span>
      </div>
      <div className="dashboard-list-meta">
        <Badge variant={coloredStatusBadgeVariant(ticket.currentStatus)}>
          {ticket.currentStatus}
        </Badge>
        {showPriority && (
          ticket.itPriority ? (
            <Badge variant={priorityBadgeVariant(ticket.itPriority)}>
              {ticket.itPriority}
            </Badge>
          ) : (
            <Badge variant="neutral">Not set</Badge>
          )
        )}
        {showOwner && (
          <span className="dashboard-ticket-owner">
            {(ticket.owner && ticket.owner.name) ? ticket.owner.name : "Unassigned"}
          </span>
        )}
        {time && (
          <time className="dashboard-ticket-time" dateTime={time}>
            {formatRelativeTime(time)}
          </time>
        )}
      </div>
    </Link>
  );
}

interface DashboardActionListLinkProps {
  action: DashboardActionListItem;
  to: string;
  testId?: string;
}

export function DashboardActionListLink({
  action,
  to,
  testId,
}: DashboardActionListLinkProps) {
  return (
    <Link to={to} className="dashboard-list-link" data-testid={testId}>
      <div className="dashboard-list-info">
        <span className="dashboard-ticket-number">{action.ticketNumber}</span>
        <span className="dashboard-ticket-summary">{action.description}</span>
      </div>
      <div className="dashboard-list-meta">
        {action.result && (
          <span className="dashboard-action-result">{action.result}</span>
        )}
        <time className="dashboard-ticket-time" dateTime={action.actionDate}>
          {formatRelativeTime(action.actionDate)}
        </time>
      </div>
    </Link>
  );
}

interface DashboardSkeletonProps {
  variant: "requester" | "staff";
  /** Administrators also get the Users card once data lands (ui-spec section 5.2). */
  adminCard?: boolean;
  testId?: string;
}

/**
 * Loading placeholder for the role dashboards (ui-spec section 5.1 "Loading":
 * card skeletons and list placeholders, no layout shift when data lands). It
 * lists the same sections, in the same order, as the loaded page and reuses
 * their real container classes, so loading and loaded occupy the same boxes.
 * Purely visual: the loading announcement lives in the page's live region, so
 * this block is hidden from assistive technology.
 */
export function DashboardSkeleton({
  variant,
  adminCard = false,
  testId = "dashboard-loading",
}: DashboardSkeletonProps) {
  const staff = variant === "staff";
  const card = (key: number, extra = "", sub = false) => (
    <div key={key} className={`metric-card metric-card--skeleton ${extra}`.trim()}>
      <span className="skeleton-bar skeleton-bar--value" />
      <span className="skeleton-bar skeleton-bar--label" />
      {sub && <span className="skeleton-bar skeleton-bar--sub" />}
    </div>
  );
  const rows = (count: number) =>
    Array.from({ length: count }, (_, row) => (
      <span key={row} className="skeleton-bar skeleton-bar--row" />
    ));
  const listCards = (
    <div className="dashboard-lists">
      {[0, 1].map((i) => (
        <div key={i} className="dashboard-list-card">
          <span className="skeleton-bar skeleton-bar--title" />
          {rows(3)}
        </div>
      ))}
    </div>
  );

  return (
    <div data-testid={testId} aria-hidden="true">
      <div className={`dashboard-grid${staff ? " dashboard-grid--staff" : ""}`}>
        {Array.from({ length: staff ? 4 : 5 }, (_, i) => card(i))}
      </div>

      {!staff && (
        // Attention card + the Create Ticket button beside it.
        <div className="dashboard-attention">
          {card(100, "metric-card--attention")}
          <div className="dashboard-quick-actions">
            <span className="skeleton-bar skeleton-bar--button" />
          </div>
        </div>
      )}

      {staff && (
        <>
          <div className="dashboard-ownership">{[0, 1].map((i) => card(200 + i))}</div>

          <div className="priority-strip">
            <span className="skeleton-bar skeleton-bar--title" />
            <div className="priority-strip__buckets">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="priority-strip__item">
                  <span className="skeleton-bar skeleton-bar--label" />
                  <span className="skeleton-bar skeleton-bar--count" />
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-urgent-section">
            <div className="dashboard-urgent-header dashboard-urgent-header--skeleton">
              <span className="skeleton-bar skeleton-bar--title skeleton-bar--flush" />
              <span className="skeleton-bar skeleton-bar--links" />
            </div>
            {rows(3)}
          </div>
        </>
      )}

      {listCards}

      {staff && adminCard && (
        <div className="dashboard-admin-section">
          <span className="skeleton-bar skeleton-bar--title" />
          {card(300, "", true)}
        </div>
      )}
    </div>
  );
}
