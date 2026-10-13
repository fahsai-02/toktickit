import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  fetchTicket,
  fetchTicketComments,
  postPublicComment,
  indicateResolved,
  fetchTicketActions,
  type TicketDetail as TicketDetailType,
  type Attachment,
  type PublicComment,
  type ActionTaken,
  ApiError,
} from "./api.js";
import Badge, {
  coloredStatusBadgeVariant,
  priorityBadgeVariant,
  roleBadgeVariant,
} from "./components/Badge.js";
import ReadOnlyField from "./components/ReadOnlyField.js";
import ListState from "./components/ListState.js";
import TextArea from "./components/TextArea.js";
import Button from "./components/Button.js";
import AttachmentSection from "./components/AttachmentSection.js";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { formatDate, formatActionDateTime, relativeDayHint } from "./lib/format.js";

const COMMENT_MAX_LENGTH = 2000;

type DetailState = "loading" | "error" | "not-found" | "access-denied" | "idle";
type CommentsState = "loading" | "idle" | "error";

/** Date/Time cell: absolute Asia/Bangkok wall clock plus an optional hint. */
function ActionDate({ iso }: { iso: string }) {
  const hint = relativeDayHint(iso);
  return (
    <span className="actions-date">
      {formatActionDateTime(iso)}
      {hint && <span className="actions-date-hint"> ({hint})</span>}
    </span>
  );
}

/** Read-only Follow-Up cell (ui-spec 5.4). */
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

export default function TicketDetail() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [ticket, setTicket] = useState<TicketDetailType | null>(null);
  const [state, setState] = useState<DetailState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const [comments, setComments] = useState<PublicComment[]>([]);
  const [commentsState, setCommentsState] = useState<CommentsState>("loading");
  const [commentError, setCommentError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState("");

  // Actions Taken (read-only for the Requester — ui-spec 5.4). No write path
  // exists for this role, so the panel is rendered without any controls.
  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [actionsState, setActionsState] = useState<CommentsState>("loading");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!ticketId) return;
    const id = Number(ticketId);
    if (!Number.isFinite(id) || id <= 0) {
      setState("not-found");
      return;
    }

    let cancelled = false;
    setState("loading");
    setErrorMessage("");
    setActions([]);
    setActionsState("loading");
    setActionError("");

    fetchTicket(id)
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

    // Public Comments are fetched alongside the ticket (api-spec 4.8).
    fetchTicketComments(id)
      .then((data) => {
        if (cancelled) return;
        setComments(data);
        setCommentsState("idle");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "FORBIDDEN") {
          setCommentsState("idle");
        } else {
          setCommentError(
            err instanceof Error ? err.message : "Could not load comments."
          );
          setCommentsState("error");
        }
      });

    // Actions Taken are read-only here; a 403 (foreign ticket) is treated as an
    // empty area rather than an error banner.
    fetchTicketActions(id)
      .then((data) => {
        if (cancelled) return;
        setActions(data);
        setActionsState("idle");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "FORBIDDEN") {
          setActionsState("idle");
        } else {
          setActionError(
            err instanceof Error ? err.message : "Could not load actions."
          );
          setActionsState("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ticketId]);
  if (state === "loading") {
    return (
      <div className="container ticket-detail">
        <ListState testId="loading-state" loading message="Loading ticket..." />
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
        <ListState testId="not-found-state" message="Ticket not found.">
          <Button variant="secondary" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </ListState>
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
        <ListState
          testId="access-denied-state"
          variant="error"
          message="You don't have access to this ticket."
        >
          <Button variant="secondary" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </ListState>
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
        <ListState
          testId="error-state"
          variant="error"
          message={<p className="error-banner">{errorMessage}</p>}
        >
          <Button variant="secondary" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </ListState>
      </div>
    );
  }

  if (!ticket) return null;

  const handleAttachmentsUpdate = (input: Attachment[] | ((prev: Attachment[]) => Attachment[])) => {
    if (!ticket) return;
    const newAttachments = typeof input === "function" ? input(ticket.attachments) : input;
    setTicket({ ...ticket, attachments: newAttachments });
  };

  const handleToggleResolved = async () => {
    if (!ticket || toggling) return;
    setToggling(true);
    setToggleError("");
    try {
      const updated = await indicateResolved(ticket.id);
      setTicket({
        ...ticket,
        requesterIndicatedResolved: updated.requesterIndicatedResolved,
        indicatedResolvedAt: updated.indicatedResolvedAt,
      });
    } catch (err) {
      setToggleError(
        err instanceof Error ? err.message : "Could not update the indicator."
      );
    } finally {
      setToggling(false);
    }
  };

  const handlePostComment = async () => {
    if (!ticket || posting) return;
    const content = commentText.trim();
    if (content.length < 1 || content.length > COMMENT_MAX_LENGTH) {
      setCommentError(
        `Comment text is required (1-${COMMENT_MAX_LENGTH} characters).`
      );
      return;
    }
    setPosting(true);
    setCommentError("");
    try {
      const comment = await postPublicComment(ticket.id, content);
      setComments((prev) => [comment, ...prev]);
      setCommentText("");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.fields?.content ?? err.message
          : err instanceof Error
            ? err.message
            : "Could not post your comment.";
      setCommentError(message);
    } finally {
      setPosting(false);
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
        <Badge variant={coloredStatusBadgeVariant(ticket.currentStatus)}>
          {ticket.currentStatus}
        </Badge>
      </div>

      <div className="ticket-detail-card">
        <div className="ticket-detail-grid">
          <ReadOnlyField id="requester" label="Requester" value={ticket.requester.name} />
          <ReadOnlyField id="category" label="Category" value={ticket.category.name} />
          <ReadOnlyField id="related-system" label="Related System" value={ticket.relatedSystem.name} />
          <ReadOnlyField id="requested-priority" label="Requested Priority">
            <Badge variant={priorityBadgeVariant(ticket.requestedPriority)}>
              {ticket.requestedPriority}
            </Badge>
          </ReadOnlyField>
          <ReadOnlyField id="it-priority" label="IT Priority">
            {ticket.itPriority ? (
              <Badge variant={priorityBadgeVariant(ticket.itPriority)}>
                {ticket.itPriority}
              </Badge>
            ) : (
              <Badge variant="neutral">&mdash;</Badge>
            )}
          </ReadOnlyField>
          <ReadOnlyField id="ticket-date" label="Ticket Date" value={formatDate(ticket.ticketDate)} />
          <ReadOnlyField id="created" label="Created" value={formatDate(ticket.createdAt)} />
          <ReadOnlyField id="updated" label="Last Updated" value={formatDate(ticket.updatedAt)} />
        </div>

        <ReadOnlyField id="summary" label="Summary" value={ticket.summary} />

        <ReadOnlyField
          id="description"
          label="Description"
          className="ticket-detail-description"
          value={ticket.description}
        />

        {ticket.resolutionSummary && (
          <ReadOnlyField
            id="resolution-summary"
            label="Resolution Summary"
            className="resolution-summary"
            testId="resolution-summary"
            value={ticket.resolutionSummary}
          />
        )}
      </div>

      {/* "Problem Appears Resolved" toggle (ui-spec 5.3, api-spec 4.9) */}
      <div className="ticket-actions" data-testid="ticket-actions">
        {ticket.requesterIndicatedResolved ? (
          <div
            className="resolved-confirmation"
            data-testid="resolved-confirmation"
          >
            <CheckCircle2 size={20} aria-hidden="true" />
            <span>You indicated this problem appears resolved.</span>
            <Button
              variant="ghost"
              onClick={() => void handleToggleResolved()}
              loading={toggling}
              data-testid="retract-resolved-btn"
            >
              Retract
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            onClick={() => void handleToggleResolved()}
            loading={toggling}
            data-testid="indicate-resolved-btn"
          >
            Problem Appears Resolved
          </Button>
        )}
        {toggleError && (
          <p className="field-error-msg" data-testid="toggle-error">
            {toggleError}
          </p>
        )}
      </div>

      {/* Attachments */}
      <AttachmentSection
        ticketId={ticket.id}
        attachments={ticket.attachments}
        onUpdate={handleAttachmentsUpdate}
      />

      {/* Actions Taken — read-only (ui-spec 5.4): below the details card and
          above Public Comments. No Record/Edit/Delete control, no assignee,
          no per-action status control (FR-03, BR-08, FR-24, FR-25). */}
      <section className="actions-section" data-testid="requester-actions">
        <h2 className="ticket-detail-section-title">
          Actions Taken ({actions.length})
        </h2>

        {actionsState === "loading" && (
          <ListState testId="actions-loading" loading message="Loading actions..." />
        )}

        {actionsState === "error" && (
          <div className="list-state list-state--error" data-testid="actions-error">
            <p className="error-banner">{actionError}</p>
          </div>
        )}

        {actionsState === "idle" && actions.length === 0 && (
          <ListState
            testId="actions-empty"
            message="No actions have been recorded yet."
          />
        )}

        {actionsState === "idle" && actions.length > 0 && (
          <>
            <table
              className="actions-table actions-table-desktop"
              data-testid="actions-table"
            >
              <caption className="sr-only">
                Actions recorded for this ticket
              </caption>
              <thead>
                <tr>
                  <th scope="col">Date/Time</th>
                  <th scope="col">Description</th>
                  <th scope="col">Result</th>
                  <th scope="col">Performed By</th>
                  <th scope="col">Follow-Up</th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => (
                  <tr key={action.id} data-testid={`action-${action.id}`}>
                    <td>
                      <ActionDate iso={action.actionDate} />
                    </td>
                    <td>{action.description}</td>
                    <td>{action.result}</td>
                    <td>{action.performedBy.name}</td>
                    <td>
                      <ActionFollowUp action={action} />
                    </td>
                    <td>
                      {action.attachmentNotes ? (
                        action.attachmentNotes
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="actions-cards-mobile" data-testid="actions-cards">
              {actions.map((action) => (
                <article
                  key={action.id}
                  className="action-card"
                  data-testid={`action-card-${action.id}`}
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
                    <dd>{action.performedBy.name}</dd>
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
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Public Comments (ui-spec 5.3, api-spec 4.7-4.8) */}
      <section className="comments-section" data-testid="public-comments">
        <h2 className="ticket-detail-section-title">
          Public Comments ({comments.length})
        </h2>

        {commentsState === "loading" && (
          <ListState testId="comments-loading" loading message="Loading comments..." />
        )}

        {commentsState === "error" && (
          <div className="list-state list-state--error" data-testid="comments-error">
            <p className="error-banner">{commentError}</p>
          </div>
        )}

        {commentsState === "idle" && comments.length === 0 && (
          <p className="text-muted" data-testid="no-comments">
            No comments yet.
          </p>
        )}

        {commentsState === "idle" && comments.length > 0 && (
          <ul className="comment-timeline" data-testid="comment-timeline">
            {comments.map((c) => (
              <li
                key={c.id}
                className="comment-item"
                data-testid={`comment-${c.id}`}
              >
                <div className="comment-meta">
                  <span className="comment-author">{c.author.name}</span>
                  <Badge variant={roleBadgeVariant(c.author.role)}>
                    {c.author.role}
                  </Badge>
                  <span className="comment-timestamp">
                    {formatDate(c.createdAt)}
                  </span>
                </div>
                <p className="comment-content">{c.content}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="comment-composer">
          <TextArea
            id="comment-input"
            label="Add a comment"
            rows={3}
            maxLength={COMMENT_MAX_LENGTH}
            placeholder="Type your comment here..."
            value={commentText}
            onChange={(e) => {
              setCommentText(e.target.value);
              setCommentError("");
            }}
            error={commentError}
            errorTestId="comment-error"
            data-testid="comment-input"
          />
          <div className="comment-composer-actions">
            <Button
              variant="primary"
              onClick={() => void handlePostComment()}
              loading={posting}
              disabled={commentText.trim().length === 0}
              data-testid="post-comment-btn"
            >
              Post Comment
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}