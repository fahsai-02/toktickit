import "./Badge.css";

type BadgeVariant =
  | "status-new"
  | "priority-low"
  | "priority-medium"
  | "priority-high"
  | "priority-urgent"
  | "it-priority"
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
