import "./Badge.css";

type BadgeVariant =
  | "status-new"
  | "status-open"
  | "status-in-progress"
  | "status-waiting"
  | "status-resolved"
  | "status-closed"
  | "status-reopened"
  | "status-cancelled"
  | "priority-low"
  | "priority-medium"
  | "priority-high"
  | "priority-urgent"
  | "it-priority"
  | "role-requester"
  | "role-it-staff"
  | "role-administrator"
  | "active"
  | "inactive"
  | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClass: Record<BadgeVariant, string> = {
  "status-new": "badge-status-new",
  "status-open": "badge-status-open",
  "status-in-progress": "badge-status-in-progress",
  "status-waiting": "badge-status-waiting",
  "status-resolved": "badge-status-resolved",
  "status-closed": "badge-status-closed",
  "status-reopened": "badge-status-reopened",
  "status-cancelled": "badge-status-cancelled",
  "priority-low": "badge-priority-low",
  "priority-medium": "badge-priority-medium",
  "priority-high": "badge-priority-high",
  "priority-urgent": "badge-priority-urgent",
  "it-priority": "badge-it-priority",
  "role-requester": "badge-role-requester",
  "role-it-staff": "badge-role-it-staff",
  "role-administrator": "badge-role-administrator",
  active: "badge-active",
  inactive: "badge-inactive",
  neutral: "badge-neutral",
};

export function statusBadgeVariant(
  status: string | undefined
): BadgeVariant {
  if (status === "NEW") return "status-new";
  return "neutral";
}

/**
 * Color-coded status badge for ALL 8 statuses (ui-spec "Badges" table: NEW,
 * OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED,
 * CANCELLED). Used by the IT Staff queue (Issue 19 AC-481); the legacy
 * `statusBadgeVariant` above is left untouched so older screens/tests keep
 * their current behavior until STYLE-02 adopts the full mapping.
 */
export function coloredStatusBadgeVariant(
  status: string | undefined
): BadgeVariant {
  switch (status) {
    case "NEW":
      return "status-new";
    case "OPEN":
      return "status-open";
    case "IN_PROGRESS":
      return "status-in-progress";
    case "WAITING_FOR_REQUESTER":
      return "status-waiting";
    case "RESOLVED":
      return "status-resolved";
    case "CLOSED":
      return "status-closed";
    case "REOPENED":
      return "status-reopened";
    case "CANCELLED":
      return "status-cancelled";
    default:
      return "neutral";
  }
}

export function priorityBadgeVariant(
  priority: string | undefined
): BadgeVariant {
  switch (priority) {
    case "LOW":
      return "priority-low";
    case "MEDIUM":
      return "priority-medium";
    case "HIGH":
      return "priority-high";
    case "URGENT":
      return "priority-urgent";
    default:
      return "neutral";
  }
}

/** Role badge mapping (ui-spec.md section 3). */
export function roleBadgeVariant(role: string | undefined): BadgeVariant {
  switch (role) {
    case "REQUESTER":
      return "role-requester";
    case "IT_STAFF":
      return "role-it-staff";
    case "ADMINISTRATOR":
      return "role-administrator";
    default:
      return "neutral";
  }
}

/** Active/Inactive badge mapping (ui-spec.md section 5.6). */
export function activeBadgeVariant(isActive: boolean): BadgeVariant {
  return isActive ? "active" : "inactive";
}

export default function Badge({
  variant = "neutral",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`badge ${variantClass[variant]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
