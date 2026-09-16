import "./Badge.css";

type BadgeVariant =
  | "status-new"
  | "priority-low"
  | "priority-medium"
  | "priority-high"
  | "priority-urgent"
  | "it-priority"
  | "role-requester"
  | "role-it-staff"
  | "role-administrator"
  | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClass: Record<BadgeVariant, string> = {
  "status-new": "badge-status-new",
  "priority-low": "badge-priority-low",
  "priority-medium": "badge-priority-medium",
  "priority-high": "badge-priority-high",
  "priority-urgent": "badge-priority-urgent",
  "it-priority": "badge-it-priority",
  "role-requester": "badge-role-requester",
  "role-it-staff": "badge-role-it-staff",
  "role-administrator": "badge-role-administrator",
  neutral: "badge-neutral",
};

export function statusBadgeVariant(
  status: string | undefined
): BadgeVariant {
  if (status === "NEW") return "status-new";
  return "neutral";
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
