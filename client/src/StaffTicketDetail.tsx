import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useParams, Link } from "react-router-dom";
import {
  fetchStaffTicket,
  fetchStaffComments,
  postStaffComment,
  fetchInternalNotes,
  createInternalNote,
  fetchStaffUsers,
  fetchCategories,
  claimTicket,
  assignTicket,
  updateStaffTicketPriority,
  updateStaffTicketStatus,
  updateStaffTicketCategory,
  saveResolutionSummary,
  ApiError,
  type StaffTicketDetail as StaffTicketDetailType,
  type StaffUser,
  type Category,
  type PublicComment,
  type InternalNote,
  type Attachment,
  type TicketStatus,
  type User,
} from "./api.js";
import Badge, {
  coloredStatusBadgeVariant,
  priorityBadgeVariant,
  roleBadgeVariant,
} from "./components/Badge.js";
import ReadOnlyField from "./components/ReadOnlyField.js";
import SelectField from "./components/SelectField.js";
import ListState from "./components/ListState.js";
import TextArea from "./components/TextArea.js";
import Button from "./components/Button.js";
import AttachmentSection from "./components/AttachmentSection.js";
import { useAuth } from "./AuthContext.js";
import { transitionsFrom, requiresConfirmation, statusLabel } from "./lib/statusTransitions.js";
import { PRIORITY_OPTIONS } from "./lib/options.js";
import { formatDate } from "./lib/format.js";
import {
  ArrowLeft,
  Lock,
  MessageSquare,
  CheckCircle2,
  UserCheck,
} from "lucide-react";

const TEXT_MAX_LENGTH = 2000;

type DetailState = "loading" | "error" | "not-found" | "access-denied" | "idle";
type CommsState = "loading" | "idle" | "error";
type ActiveTab = "comments" | "notes" | "attachments";

function friendlyError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return err.fields?.content ?? err.message;
  }
  return err instanceof Error ? err.message : fallback;
}

export default function StaffTicketDetail() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<StaffTicketDetailType | null>(null);
  const [state, setState] = useState<DetailState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);

  const [comments, setComments] = useState<PublicComment[]>([]);
  const [commentsState, setCommentsState] = useState<CommsState>("loading");
  const [commentError, setCommentError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [notesState, setNotesState] = useState<CommsState>("loading");
  const [noteError, setNoteError] = useState("");
  const [noteText, setNoteText] = useState("");
  const [creatingNote, setCreatingNote] = useState(false);

  const [tab, setTab] = useState<ActiveTab>("comments");

  // Per-operation busy/error state.
  const [claiming, setClaiming] = useState(false);
  const [claimingError, setClaimingError] = useState("");
  const [claimNote, setClaimNote] = useState("");
  const [ownerSaving, setOwnerSaving] = useState(false);
  const [ownerError, setOwnerError] = useState("");
  const [prioritySaving, setPrioritySaving] = useState(false);
  const [priorityError, setPriorityError] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  const [resolutionText, setResolutionText] = useState("");
  const [resolutionSaving, setResolutionSaving] = useState(false);
  const [resolutionError, setResolutionError] = useState("");
  const [resolutionSaved, setResolutionSaved] = useState(false);

  const [pendingTransition, setPendingTransition] = useState<TicketStatus | null>(null);
  const pendingTriggerRef = useRef<HTMLSelectElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

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
    setTab("comments");

    fetchStaffTicket(id)
      .then((data) => {
        if (cancelled) return;
        setTicket(data);
        setResolutionText(data.resolutionSummary ?? "");
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

    // Owner/priority/category dropdown data + the two timelines load in the
    // background (api-spec 5.2 "same as 4.3", ui-spec 5.5).
    fetchStaffComments(id)
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

    fetchInternalNotes(id)
      .then((data) => {
        if (cancelled) return;
        setNotes(data);
        setNotesState("idle");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "FORBIDDEN") {
          setNotesState("idle");
        } else {
          setNoteError(
            err instanceof Error ? err.message : "Could not load notes."
          );
          setNotesState("error");
        }
      });

    Promise.all([fetchCategories(), fetchStaffUsers()])
      .then(([cat, users]) => {
        if (cancelled) return;
        setCategories(cat);
        setStaffUsers(users);
      })
      .catch(() => {
        // Dropdown data is auxiliary — the screen still works without it.
      });

    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  // Focus trap + Escape for the status-transition confirm dialog (ui-spec
  // section 8 dialog rules; same pattern as AttachmentSection's remove dialog).
  useEffect(() => {
    if (!pendingTransition) return;
    const previousFocus = document.activeElement as HTMLElement;
    const dialog = dialogRef.current;
    if (!dialog) return;

    document.body.style.overflow = "hidden";

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = dialog.querySelectorAll<HTMLElement>(focusableSelector);
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];

    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setPendingTransition(null);
        pendingTriggerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previousFocus?.focus();
    };
  }, [pendingTransition]);

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
        <Link to="/staff/queue" className="back-link">
          <ArrowLeft size={16} />
          My Queue
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
        <Link to="/staff/queue" className="back-link">
          <ArrowLeft size={16} />
          My Queue
        </Link>
        <ListState
          testId="forbidden-state"
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
        <Link to="/staff/queue" className="back-link">
          <ArrowLeft size={16} />
          My Queue
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

  const statusOptions = transitionsFrom(ticket.currentStatus);
  const isOwner = ticket.owner?.id === user?.id;

  const handleAttachmentsUpdate = (
    input: Attachment[] | ((prev: Attachment[]) => Attachment[])
  ) => {
    if (!ticket) return;
    const newAttachments =
      typeof input === "function" ? input(ticket.attachments) : input;
    setTicket({ ...ticket, attachments: newAttachments });
  };

  const handleClaim = async () => {
    if (!ticket || claiming) return;
    setClaiming(true);
    setClaimingError("");
    setClaimNote("");
    try {
      const { owner } = await claimTicket(ticket.id);
      setTicket({ ...ticket, owner });
      setClaimNote("You are now the owner of this ticket.");
    } catch (err) {
      setClaimingError(
        err instanceof Error ? err.message : "Could not claim this ticket."
      );
    } finally {
      setClaiming(false);
    }
  };

  const handleAssigneeChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    if (!ticket) return;
    const ownerId = Number(e.target.value);
    if (!ownerId || ownerId === ticket.owner?.id) return;
    setOwnerSaving(true);
    setOwnerError("");
    setClaimNote("");
    try {
      const { owner } = await assignTicket(ticket.id, ownerId);
      setTicket({ ...ticket, owner });
    } catch (err) {
      setOwnerError(
        err instanceof Error ? err.message : "Could not reassign this ticket."
      );
      setTicket({ ...ticket });
    } finally {
      setOwnerSaving(false);
    }
  };

  const handlePriorityChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    if (!ticket) return;
    const value = e.target.value as StaffTicketDetailType["itPriority"];
    if (!value || value === ticket.itPriority) return;
    setPrioritySaving(true);
    setPriorityError("");
    try {
      const { itPriority } = await updateStaffTicketPriority(ticket.id, value);
      setTicket({ ...ticket, itPriority });
    } catch (err) {
      setPriorityError(
        err instanceof Error ? err.message : "Could not set IT priority."
      );
    } finally {
      setPrioritySaving(false);
    }
  };

  const applyStatus = async (next: TicketStatus) => {
    if (!ticket || statusSaving) return;
    setStatusSaving(true);
    setStatusError("");
    try {
      const { currentStatus } = await updateStaffTicketStatus(ticket.id, next);
      setTicket({ ...ticket, currentStatus });
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : "Could not update status."
      );
    } finally {
      setStatusSaving(false);
    }
  };

  const handleStatusChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (!ticket) return;
    const value = e.target.value as TicketStatus;
    if (!value) return;
    if (requiresConfirmation(ticket.currentStatus, value)) {
      pendingTriggerRef.current = e.currentTarget;
      setPendingTransition(value);
      return;
    }
    void applyStatus(value);
  };

  const handleCategoryChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    if (!ticket) return;
    const categoryId = Number(e.target.value);
    if (!categoryId || categoryId === ticket.category.id) return;
    setCategorySaving(true);
    setCategoryError("");
    try {
      const { category } = await updateStaffTicketCategory(ticket.id, categoryId);
      setTicket({ ...ticket, category });
    } catch (err) {
      setCategoryError(
        err instanceof Error ? err.message : "Could not change category."
      );
    } finally {
      setCategorySaving(false);
    }
  };

  const handleSaveResolution = async () => {
    if (!ticket || resolutionSaving) return;
    const content = resolutionText.trim();
    if (content.length < 1 || content.length > TEXT_MAX_LENGTH) {
      setResolutionError(
        `Resolution summary must be 1-${TEXT_MAX_LENGTH} characters.`
      );
      return;
    }
    setResolutionSaving(true);
    setResolutionError("");
    setResolutionSaved(false);
    try {
      const { resolutionSummary } = await saveResolutionSummary(ticket.id, content);
      setTicket({ ...ticket, resolutionSummary });
      setResolutionSaved(true);
    } catch (err) {
      setResolutionError(
        err instanceof Error ? err.message : "Could not save resolution summary."
      );
    } finally {
      setResolutionSaving(false);
    }
  };

  const handlePostComment = async () => {
    if (!ticket || posting) return;
    const content = commentText.trim();
    if (content.length < 1 || content.length > TEXT_MAX_LENGTH) {
      setCommentError(
        `Comment text is required (1-${TEXT_MAX_LENGTH} characters).`
      );
      return;
    }
    setPosting(true);
    setCommentError("");
    try {
      const comment = await postStaffComment(ticket.id, content);
      setComments((prev) => [comment, ...prev]);
      setCommentText("");
    } catch (err) {
      setCommentError(friendlyError(err, "Could not post your comment."));
    } finally {
      setPosting(false);
    }
  };

  const handleCreateNote = async () => {
    if (!ticket || creatingNote) return;
    const content = noteText.trim();
    if (content.length < 1 || content.length > TEXT_MAX_LENGTH) {
      setNoteError(`Note text is required (1-${TEXT_MAX_LENGTH} characters).`);
      return;
    }
    setCreatingNote(true);
    setNoteError("");
    try {
      const note = await createInternalNote(ticket.id, content);
      setNotes((prev) => [note, ...prev]);
      setNoteText("");
    } catch (err) {
      setNoteError(friendlyError(err, "Could not create your note."));
    } finally {
      setCreatingNote(false);
    }
  };

  const ownerOptions = staffUsers.map((u) => ({
    value: u.id,
    label: u.name,
  }));

  const currentOwner = ticket.owner;
  if (currentOwner && !staffUsers.some((u) => u.id === currentOwner.id)) {
    ownerOptions.push({ value: currentOwner.id, label: currentOwner.name });
  }

  return (
    <div className="container staff-ticket-detail" data-testid="staff-ticket-detail">
      <div className="staff-detail-topbar">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          My Queue &gt; Ticket Detail
        </nav>
        <Link to="/staff/queue" className="back-link" data-testid="back-queue-link">
          <ArrowLeft size={16} />
          Back to Queue
        </Link>
      </div>

      <div className="ticket-detail-header">
        <h1 className="ticket-detail-number">{ticket.ticketNumber}</h1>
        <Badge variant={coloredStatusBadgeVariant(ticket.currentStatus)}>
          {ticket.currentStatus}
        </Badge>
      </div>

      <div className="staff-detail-layout">
        {/* ── Left: operational meta + description (ui-spec 5.5) ─────────── */}
        <div className="staff-detail-info">
          <div className="ticket-detail-card">
            <div className="ticket-detail-grid">
              <ReadOnlyField
                id="ticket-number"
                label="Ticket No."
                value={ticket.ticketNumber}
                testId="staff-ticket-number"
              />
              <SelectField
                id="category-select"
                label="Category"
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                value={String(ticket.category.id)}
                onChange={(e) => void handleCategoryChange(e)}
                disabled={categorySaving}
                error={categoryError}
                errorTestId="category-error"
                data-testid="staff-category-select"
              />
              <ReadOnlyField
                id="related-system"
                label="Related System"
                value={ticket.relatedSystem.name}
              />
              <ReadOnlyField
                id="requester"
                label="Requester"
                value={ticket.requester.name}
              />
              <ReadOnlyField id="requested-priority" label="Requested Priority">
                <Badge variant={priorityBadgeVariant(ticket.requestedPriority)}>
                  {ticket.requestedPriority}
                </Badge>
              </ReadOnlyField>
              <SelectField
                id="current-status-select"
                label="Current Status"
                placeholder={statusLabel(ticket.currentStatus)}
                options={statusOptions.map((s) => ({
                  value: s,
                  label: statusLabel(s),
                }))}
                value=""
                onChange={(e) => handleStatusChange(e)}
                disabled={statusSaving}
                error={statusError}
                errorTestId="status-error"
                data-testid="staff-status-select"
              />
              <SelectField
                id="owner-select"
                label="Ticket Owner"
                placeholder="Unassigned"
                options={ownerOptions}
                value={ticket.owner ? String(ticket.owner.id) : ""}
                onChange={(e) => void handleAssigneeChange(e)}
                disabled={ownerSaving}
                error={ownerError}
                errorTestId="owner-error"
                data-testid="staff-owner-select"
              />
              <SelectField
                id="it-priority-select"
                label="IT Priority"
                placeholder="Not set"
                options={PRIORITY_OPTIONS}
                value={ticket.itPriority ?? ""}
                onChange={(e) => void handlePriorityChange(e)}
                disabled={prioritySaving}
                error={priorityError}
                errorTestId="it-priority-error"
                data-testid="staff-it-priority-select"
              />
            </div>

            {ticket.requesterIndicatedResolved && (
              <div
                className="resolved-indicator"
                data-testid="requester-resolved-indicator"
              >
                <CheckCircle2 size={16} aria-hidden="true" />
                The requester indicated this problem appears resolved
                {ticket.indicatedResolvedAt
                  ? ` (${formatDate(ticket.indicatedResolvedAt)})`
                  : ""}
                .
              </div>
            )}

            <div className="staff-claim-row">
              {isOwner ? (
                <span className="claim-owned" data-testid="claimed-by-you">
                  <UserCheck size={16} aria-hidden="true" />
                  Claimed by you
                </span>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => void handleClaim()}
                  loading={claiming}
                  data-testid="claim-btn"
                >
                  Claim Ticket
                </Button>
              )}
              {claimNote && (
                <span className="field-success-msg" data-testid="claim-note">
                  {claimNote}
                </span>
              )}
              {claimingError && (
                <span className="field-error-msg" data-testid="claim-error">
                  {claimingError}
                </span>
              )}
            </div>
          </div>

          <div className="ticket-detail-card">
            <ReadOnlyField id="summary" label="Summary" value={ticket.summary} />
            <ReadOnlyField
              id="description"
              label="Description"
              className="ticket-detail-description"
              value={ticket.description}
            />
            <div className="resolution-card">
              <TextArea
                id="resolution-summary-input"
                label="Resolution Summary"
                rows={3}
                maxLength={TEXT_MAX_LENGTH}
                placeholder="Add resolution summary (visible to requester)..."
                value={resolutionText}
                onChange={(e) => {
                  setResolutionText(e.target.value);
                  setResolutionError("");
                }}
                error={resolutionError}
                errorTestId="resolution-error"
                data-testid="resolution-input"
              />
              <div className="resolution-actions">
                <Button
                  variant="primary"
                  onClick={() => void handleSaveResolution()}
                  loading={resolutionSaving}
                  disabled={resolutionText.trim().length === 0}
                  data-testid="save-resolution-btn"
                >
                  Save Resolution Summary
                </Button>
                {resolutionSaved && (
                  <span className="field-success-msg" data-testid="resolution-saved">
                    Saved.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: communication tabs (ui-spec 5.5) ───────────────────── */}
        <div className="staff-detail-comms">
          <div className="detail-tabs" role="tablist" aria-label="Ticket detail">
            <button
              role="tab"
              aria-selected={tab === "comments"}
              className={`detail-tab ${tab === "comments" ? "detail-tab--active" : ""}`}
              onClick={() => setTab("comments")}
              data-testid="tab-comments"
            >
              Public Comments ({comments.length})
            </button>
            <button
              role="tab"
              aria-selected={tab === "notes"}
              className={`detail-tab ${tab === "notes" ? "detail-tab--active" : ""}`}
              onClick={() => setTab("notes")}
              data-testid="tab-notes"
            >
              Internal Notes ({notes.length})
            </button>
            <button
              role="tab"
              aria-selected={tab === "attachments"}
              className={`detail-tab ${tab === "attachments" ? "detail-tab--active" : ""}`}
              onClick={() => setTab("attachments")}
              data-testid="tab-attachments"
            >
              Attachments ({ticket.attachments.length})
            </button>
          </div>

          {tab === "comments" && (
            <section
              className="comments-section"
              data-testid="panel-comments"
              role="tabpanel"
              aria-label="Public Comments"
            >
              {commentsState === "loading" && (
                <ListState
                  testId="comments-loading"
                  loading
                  message="Loading comments..."
                />
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
                        <span className="visibility-chip">
                          <MessageSquare size={12} aria-hidden="true" />
                          Public
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
                  maxLength={TEXT_MAX_LENGTH}
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
          )}

          {tab === "notes" && (
            <section
              className="notes-section"
              data-testid="panel-notes"
              role="tabpanel"
              aria-label="Internal Notes"
            >
              <p className="notes-hint">
                <Lock size={14} aria-hidden="true" />
                Internal Notes are visible only to IT Staff and Administrators.
                The requester will never see these.
              </p>
              {notesState === "loading" && (
                <ListState
                  testId="notes-loading"
                  loading
                  message="Loading notes..."
                />
              )}
              {notesState === "error" && (
                <div className="list-state list-state--error" data-testid="notes-error">
                  <p className="error-banner">{noteError}</p>
                </div>
              )}
              {notesState === "idle" && notes.length === 0 && (
                <p className="text-muted" data-testid="no-notes">
                  No internal notes yet.
                </p>
              )}
              {notesState === "idle" && notes.length > 0 && (
                <ul className="note-timeline" data-testid="note-timeline">
                  {notes.map((n) => (
                    <li
                      key={n.id}
                      className="note-item"
                      data-testid={`note-${n.id}`}
                    >
                      <div className="comment-meta">
                        <span className="comment-author">{n.author.name}</span>
                        <Badge variant={roleBadgeVariant(n.author.role)}>
                          {n.author.role}
                        </Badge>
                        <span className="comment-timestamp">
                          {formatDate(n.createdAt)}
                        </span>
                        <span className="visibility-chip visibility-chip--internal">
                          <Lock size={12} aria-hidden="true" />
                          Internal
                        </span>
                      </div>
                      <p className="comment-content">{n.content}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="comment-composer">
                <TextArea
                  id="note-input"
                  label="Add an internal note"
                  rows={3}
                  maxLength={TEXT_MAX_LENGTH}
                  placeholder="Internal note (visible to IT Staff and Administrators only)..."
                  value={noteText}
                  onChange={(e) => {
                    setNoteText(e.target.value);
                    setNoteError("");
                  }}
                  error={noteError}
                  errorTestId="note-error"
                  data-testid="note-input"
                />
                <div className="comment-composer-actions">
                  <Button
                    variant="secondary"
                    className="btn-internal"
                    onClick={() => void handleCreateNote()}
                    loading={creatingNote}
                    disabled={noteText.trim().length === 0}
                    data-testid="create-note-btn"
                  >
                    <Lock size={14} aria-hidden="true" />
                    Create Note
                  </Button>
                </div>
              </div>
            </section>
          )}

          {tab === "attachments" && (
            <section
              data-testid="panel-attachments"
              role="tabpanel"
              aria-label="Attachments"
            >
              <AttachmentSection
                ticketId={ticket.id}
                attachments={ticket.attachments}
                onUpdate={handleAttachmentsUpdate}
              />
            </section>
          )}
        </div>
      </div>

      {/* ── BR-12 confirmation dialog (ui-spec section 8 dialog rules) ──── */}
      {pendingTransition && (
        <div className="remove-dialog-overlay" data-testid="status-confirm-dialog">
          <div
            className="remove-dialog"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-confirm-title"
          >
            <h3 id="status-confirm-title">Change ticket status</h3>
            <p>
              Move this ticket from{" "}
              <strong>{statusLabel(ticket.currentStatus)}</strong> to{" "}
              <strong>{statusLabel(pendingTransition)}</strong>? This cannot be
              undone.
            </p>
            <div className="remove-dialog-actions">
              <Button
                variant="ghost"
                onClick={() => {
                  setPendingTransition(null);
                  pendingTriggerRef.current?.focus();
                }}
                disabled={statusSaving}
                data-testid="status-confirm-cancel"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const next = pendingTransition;
                  setPendingTransition(null);
                  void applyStatus(next);
                }}
                loading={statusSaving}
                data-testid="status-confirm-accept"
              >
                Change Status
              </Button>
            </div>
            {statusError && (
              <p className="field-error-msg" data-testid="status-error">
                {statusError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}