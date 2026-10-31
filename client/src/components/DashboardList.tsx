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
  /** Plain count cards in the first row (5 Requester, 4 staff). */
  cards: number;
  /** Variant of the first row: the staff grid has four columns. */
  staff?: boolean;
  /** Second row of placeholder cards (the staff ownership cards). */
  secondaryCards?: number;
  /** Placeholder list cards, side by side at desktop. */
  lists?: number;
  testId?: string;
}

/**
 * Loading placeholder for the role dashboards (ui-spec section 5.1 "Loading":
 * card skeletons and list placeholders, no layout shift when data lands). It
 * reuses the real card/list classes so the loaded layout occupies the same
 * boxes. Purely visual: the loading announcement lives in the page's live
 * region, so this block is hidden from assistive technology.
 */
export function DashboardSkeleton({
  cards,
  staff = false,
  secondaryCards = 0,
  lists = 2,
  testId = "dashboard-loading",
}: DashboardSkeletonProps) {
  const card = (key: number) => (
    <div key={key} className="metric-card metric-card--skeleton">
      <span className="skeleton-bar skeleton-bar--value" />
      <span className="skeleton-bar skeleton-bar--label" />
    </div>
  );
  return (
    <div data-testid={testId} aria-hidden="true">
      <div className={`dashboard-grid${staff ? " dashboard-grid--staff" : ""}`}>
        {Array.from({ length: cards }, (_, i) => card(i))}
      </div>
      {secondaryCards > 0 && (
        <div className="dashboard-ownership">
          {Array.from({ length: secondaryCards }, (_, i) => card(100 + i))}
        </div>
      )}
      <div className="dashboard-lists">
        {Array.from({ length: lists }, (_, i) => (
          <div key={i} className="dashboard-list-card">
            <span className="skeleton-bar skeleton-bar--title" />
            {[0, 1, 2].map((row) => (
              <span key={row} className="skeleton-bar skeleton-bar--row" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
