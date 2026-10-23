import { Pencil } from "lucide-react";
import Badge from "./Badge.js";
import Button from "./Button.js";
import { formatActionDateTime, relativeDayHint } from "../lib/format.js";
import type { ActionTaken } from "../api.js";

/**
 * Date/Time value: absolute Asia/Bangkok wall clock plus an optional relative
 * hint when the action is far from today (ui-spec section 5.3).
 */
function ActionDate({ iso }: { iso: string }) {
  const hint = relativeDayHint(iso);
  return (
    <span className="actions-date">
      {formatActionDateTime(iso)}
      {hint && <span className="actions-date-hint"> ({hint})</span>}
    </span>
  );
}

/** Follow-Up value: a Required badge plus the note, otherwise an em dash. */
function ActionFollowUp({ action }: { action: ActionTaken }) {
  if (!action.followUpRequired) {
    return <span className="text-muted">—</span>;
  }
  return (
    <span className="actions-followup">
      <Badge variant="priority-high">Required</Badge>
      {action.followUpNote && (
        <span className="actions-followup-note">{action.followUpNote}</span>
      )}
    </span>
  );
}

interface ActionListProps {
  actions: ActionTaken[];
  /**
   * Staff and Administrator views get an Edit control per entry; the
   * requester's read-only view omits it (ui-spec section 5.4).
   */
  onEdit?: (action: ActionTaken) => void;
  testId?: string;
}

/**
 * Actions Taken as a compact list, one entry per action, showing all six
 * fields (ui-spec section 5.3, AD-16). A list rather than a six-column table
 * because the area shares the Ticket Detail side column with the conversation
 * tabs, where six columns would leave each one too narrow to read.
 */
export default function ActionList({
  actions,
  onEdit,
  testId = "actions-list",
}: ActionListProps) {
  return (
    <ul
      className="action-list"
      data-testid={testId}
      aria-label="Actions recorded for this ticket"
    >
      {actions.map((action) => (
        <li
          key={action.id}
          className="action-card"
          data-testid={`action-${action.id}`}
        >
          <dl className="action-card-grid">
            <dt>Date/Time</dt>
            <dd>
              <ActionDate iso={action.actionDate} />
            </dd>
            <dt>Description</dt>
            <dd>{action.description}</dd>
            <dt>Result</dt>
            <dd>{action.result}</dd>
            <dt>Performed By</dt>
            <dd data-testid={`action-performed-by-${action.id}`}>
              {action.performedBy.name}
            </dd>
            <dt>Follow-Up</dt>
            <dd>
              <ActionFollowUp action={action} />
            </dd>
            <dt>Notes</dt>
            <dd>
              {action.attachmentNotes ? (
                action.attachmentNotes
              ) : (
                <span className="text-muted">—</span>
              )}
            </dd>
          </dl>
          {onEdit && (
            <div className="action-card-actions">
              <Button
                variant="ghost"
                onClick={() => onEdit(action)}
                aria-label={`Edit action from ${formatActionDateTime(
                  action.actionDate
                )}`}
                data-testid={`edit-action-${action.id}`}
              >
                <Pencil size={14} aria-hidden="true" />
                Edit
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
