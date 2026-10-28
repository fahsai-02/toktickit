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
  fetchTicketActions,
  createActionTaken,
  updateActionTaken,
  ActionConflictError,
  ApiError,
  type StaffTicketDetail as StaffTicketDetailType,
  type StaffUser,
  type Category,
  type PublicComment,
  type InternalNote,
  type Attachment,
  type ActionTaken,
  type ActionTakenInput,
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
import TextField from "./components/TextField.js";
import Toggle from "./components/Toggle.js";
import Callout from "./components/Callout.js";
import Drawer from "./components/Drawer.js";
import Button from "./components/Button.js";
import AttachmentSection from "./components/AttachmentSection.js";
import ActionList from "./components/ActionList.js";
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
// ui-spec section 5.3: the counter warns as the field nears its limit and turns
// to the error colour once it exceeds it (the action fields are not hard-capped
// with maxLength, so the over-limit state is reachable and validated on save).
const TEXT_WARN_LENGTH = Math.floor(TEXT_MAX_LENGTH * 0.9);
// BR-07 / AD-11: an Action Taken may be backdated freely but not dated into the
// future beyond five minutes (compared against the server clock).
const ACTION_DATE_FUTURE_MS = 5 * 60 * 1000;

type DetailState = "loading" | "error" | "not-found" | "access-denied" | "idle";
type CommsState = "loading" | "idle" | "error";
type ActiveTab = "comments" | "notes" | "attachments" | "actions";

interface ActionFormErrors {
  actionDate?: string;
  description?: string;
  result?: string;
  followUpNote?: string;
  attachmentNotes?: string;
}

function friendlyError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return err.fields?.content ?? err.message;
  }
  return err instanceof Error ? err.message : fallback;
}

/** "YYYY-MM-DDTHH:mm" as shown in a `datetime-local` input, in Asia/Bangkok. */
function toBangkokInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  // en-CA renders "2026-10-04, 09:30" — swap the separator for the input format.
  return parts.replace(", ", "T");
}

/**
 * The input shows Bangkok wall-clock time, so anchor it to +07:00 when parsing
 * rather than letting the browser's own zone reinterpret it (ui-spec 5.3).
 */
function fromBangkokInputValue(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(`${value}:00+07:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

/** Ascending actionDate, tie-broken by createdAt (BR-06). */
function sortActions(list: ActionTaken[]): ActionTaken[] {
  return [...list].sort((a, b) => {
    const byDate = new Date(a.actionDate).getTime() - new Date(b.actionDate).getTime();
    if (byDate !== 0) return byDate;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
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

  // Actions Taken (FR-01..FR-07, ui-spec 5.3). The list is read from the
  // server; the create/edit form lives in a Drawer and always keeps the user's
  // typing on failure (FR-21).
  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [actionsState, setActionsState] = useState<CommsState>("loading");
  const [actionError, setActionError] = useState("");
  // Bumped by the error block's Retry button so the actions list reloads
  // without refetching the Ticket and the other tabs (ui-spec 5.1/5.3).
  const [actionsReloadKey, setActionsReloadKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionTaken | null>(null);
  const [actionDateValue, setActionDateValue] = useState("");
  const [actionDescription, setActionDescription] = useState("");
  const [actionResult, setActionResult] = useState("");
  const [actionFollowUp, setActionFollowUp] = useState(false);
  const [actionFollowUpNote, setActionFollowUpNote] = useState("");
  const [actionAttachmentNotes, setActionAttachmentNotes] = useState("");
  const [formErrors, setFormErrors] = useState<ActionFormErrors>({});
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [conflictLatest, setConflictLatest] = useState<ActionTaken | null>(null);
  const [actionSaved, setActionSaved] = useState(false);
  // Synchronous single-flight guard. `formSaving` state is not yet updated
  // when a second click lands in the same tick, so a ref is what actually
  // guarantees one network call (FR-20, BR-16, UI-04).
  const actionSavingRef = useRef(false);

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
    setFormOpen(false);
    setEditingAction(null);
    setConflictLatest(null);
    setFormError("");
    setFormErrors({});

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

  // Actions Taken load independently so Retry can refetch only this list
  // without reloading the Ticket and the other tabs (ui-spec 5.1, 5.3).
  // A 403 is an expected failure and must render the visible error block
  // (FR-22); it must never be mistaken for "no actions have been recorded".
  useEffect(() => {
    if (!ticketId) return;
    const id = Number(ticketId);
    if (!Number.isFinite(id) || id <= 0) return;

    let cancelled = false;
    setActions([]);
    setActionsState("loading");
    setActionError("");

    fetchTicketActions(id)
      .then((data) => {
        if (cancelled) return;
        setActions(sortActions(data));
        setActionsState("idle");
      })
      .catch((err) => {
        if (cancelled) return;
        setActionError(
          err instanceof Error ? err.message : "Could not load actions."
        );
        setActionsState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [ticketId, actionsReloadKey]);

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

  // `_count` from the server is the authoritative total, so the tab counts do
  // not flash "(0)" while the background comment/note fetches are in flight
  // (ui-spec 5.5 "count"). After posting, the client list is as current or
  // more, hence Math.max.
  const commentCount = Math.max(ticket._count.comments, comments.length);
  const noteCount = Math.max(ticket._count.notes, notes.length);
  // Soft-removed attachments do not count (specification.md BR-18).
  const attachmentCount = ticket.attachments.filter((a) => !a.isRemoved).length;

  // The category dropdown comes from GET /api/categories, which only serves
  // active categories; a historical ticket whose category is now inactive
  // must still show its category (mirrors the deactivated-owner handling).
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  if (!categories.some((c) => c.id === ticket.category.id)) {
    categoryOptions.push({ value: ticket.category.id, label: ticket.category.name });
  }

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

  // ── Actions Taken handlers (Issue 26) ────────────────────────────────────

  const openCreateForm = () => {
    setEditingAction(null);
    setActionDateValue(toBangkokInputValue(new Date()));
    setActionDescription("");
    setActionResult("");
    setActionFollowUp(false);
    setActionFollowUpNote("");
    setActionAttachmentNotes("");
    setFormErrors({});
    setFormError("");
    setConflictLatest(null);
    setActionSaved(false);
    setFormOpen(true);
  };

  const openEditForm = (action: ActionTaken) => {
    setEditingAction(action);
    setActionDateValue(toBangkokInputValue(new Date(action.actionDate)));
    setActionDescription(action.description);
    setActionResult(action.result);
    setActionFollowUp(action.followUpRequired);
    setActionFollowUpNote(action.followUpNote ?? "");
    setActionAttachmentNotes(action.attachmentNotes ?? "");
    setFormErrors({});
    setFormError("");
    setConflictLatest(null);
    setActionSaved(false);
    setFormOpen(true);
  };

  const closeActionForm = () => {
    setFormOpen(false);
    setConflictLatest(null);
  };

  const setActionDateNow = () => {
    setActionDateValue(toBangkokInputValue(new Date()));
    setFormErrors((prev) => ({ ...prev, actionDate: undefined }));
  };

  // Client-side validation mirrors the server rules (FR-01, BR-04, BR-05,
  // BR-07). A blank/invalid form must never reach the network (UI-02, UI-08).
  const validateActionForm = (): ActionTakenInput | null => {
    const errors: ActionFormErrors = {};
    const description = actionDescription.trim();
    const result = actionResult.trim();

    if (description.length < 1 || description.length > TEXT_MAX_LENGTH) {
      errors.description = `Description is required (1-${TEXT_MAX_LENGTH} characters).`;
    }
    if (result.length < 1 || result.length > TEXT_MAX_LENGTH) {
      errors.result = `Result is required (1-${TEXT_MAX_LENGTH} characters).`;
    }
    if (actionFollowUp && actionFollowUpNote.trim().length === 0) {
      errors.followUpNote =
        "Follow-Up Note is required when follow-up is needed.";
    } else if (actionFollowUpNote.length > TEXT_MAX_LENGTH) {
      errors.followUpNote = `Follow-Up Note must be at most ${TEXT_MAX_LENGTH} characters.`;
    }
    if (actionAttachmentNotes.length > TEXT_MAX_LENGTH) {
      errors.attachmentNotes = `Attachment Notes must be at most ${TEXT_MAX_LENGTH} characters.`;
    }

    const iso = fromBangkokInputValue(actionDateValue);
    if (!iso) {
      errors.actionDate = "Enter a valid date and time.";
    } else if (new Date(iso).getTime() > Date.now() + ACTION_DATE_FUTURE_MS) {
      errors.actionDate =
        "Action Date/Time cannot be more than 5 minutes in the future.";
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0 || !iso) return null;

    return {
      actionDate: iso,
      description,
      result,
      followUpRequired: actionFollowUp,
      followUpNote: actionFollowUp ? actionFollowUpNote : null,
      attachmentNotes:
        actionAttachmentNotes.trim() === "" ? null : actionAttachmentNotes,
    };
  };

  const handleSaveAction = async () => {
    if (!ticket || actionSavingRef.current) return;
    const input = validateActionForm();
    if (!input) return;

    actionSavingRef.current = true;
    setFormSaving(true);
    setFormError("");
    setActionSaved(false);
    setConflictLatest(null);
    try {
      if (editingAction) {
        const updated = await updateActionTaken(editingAction.id, {
          ...input,
          version: editingAction.version,
        });
        setActions((prev) =>
          sortActions(prev.map((a) => (a.id === updated.id ? updated : a)))
        );
        setEditingAction(updated);
      } else {
        const created = await createActionTaken(ticket.id, input);
        setActions((prev) => sortActions([...prev, created]));
        setActionsState("idle");
      }
      setActionSaved(true);
      setFormOpen(false);
    } catch (err) {
      if (err instanceof ActionConflictError) {
        // Keep the form and the user's typing; offer the server copy (UI-07).
        setConflictLatest(err.latest);
        setFormError(err.message);
      } else if (err instanceof ApiError) {
        setFormErrors({
          description: err.fields?.description,
          result: err.fields?.result,
          followUpNote: err.fields?.followUpNote,
          attachmentNotes: err.fields?.attachmentNotes,
          actionDate: err.fields?.actionDate,
        });
        setFormError(err.message);
      } else {
        setFormError(
          err instanceof Error ? err.message : "Could not save this action."
        );
      }
    } finally {
      setFormSaving(false);
      actionSavingRef.current = false;
    }
  };

  const refreshFromConflict = () => {
    if (!conflictLatest) return;
    const latest = conflictLatest;
    setActions((prev) =>
      sortActions(prev.map((a) => (a.id === latest.id ? latest : a)))
    );
    setEditingAction(latest);
    setActionDateValue(toBangkokInputValue(new Date(latest.actionDate)));
    setActionDescription(latest.description);
    setActionResult(latest.result);
    setActionFollowUp(latest.followUpRequired);
    setActionFollowUpNote(latest.followUpNote ?? "");
    setActionAttachmentNotes(latest.attachmentNotes ?? "");
    setConflictLatest(null);
    setFormError("");
    setFormErrors({});
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
          <Link to="/staff/queue" className="breadcrumb-link">
            My Queue
          </Link>
          <span className="breadcrumb-separator" aria-hidden="true">
            {" > "}
          </span>
          <span className="breadcrumb-current">Ticket Detail</span>
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
                options={categoryOptions}
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
                disabled={statusSaving || statusOptions.length === 0}
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
                  setResolutionSaved(false);
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
              Public Comments ({commentCount})
            </button>
            <button
              role="tab"
              aria-selected={tab === "notes"}
              className={`detail-tab ${tab === "notes" ? "detail-tab--active" : ""}`}
              onClick={() => setTab("notes")}
              data-testid="tab-notes"
            >
              Internal Notes ({noteCount})
            </button>
            <button
              role="tab"
              aria-selected={tab === "attachments"}
              className={`detail-tab ${tab === "attachments" ? "detail-tab--active" : ""}`}
              onClick={() => setTab("attachments")}
              data-testid="tab-attachments"
            >
              Attachments ({attachmentCount})
            </button>
            <button
              role="tab"
              aria-selected={tab === "actions"}
              className={`detail-tab ${tab === "actions" ? "detail-tab--active" : ""}`}
              onClick={() => setTab("actions")}
              data-testid="tab-actions"
            >
              Actions Taken ({actions.length})
            </button>
          </div>

          {tab === "actions" && (
            <section
              className="actions-section"
              data-testid="panel-actions"
              role="tabpanel"
              aria-label="Actions Taken"
            >
              <div className="actions-toolbar">
                <Button
                  variant="primary"
                  onClick={openCreateForm}
                  data-testid="record-action-btn"
                >
                  Record Action
                </Button>
                <span
                  className="sr-only"
                  role="status"
                  aria-live="polite"
                  data-testid="actions-live"
                >
                  {actionSaved ? "Action saved." : ""}
                </span>
              </div>

              {actionsState === "loading" && (
                <ListState
                  testId="actions-loading"
                  loading
                  message="Loading actions..."
                />
              )}

              {actionsState === "error" && (
                <ListState
                  testId="actions-error"
                  variant="error"
                  message={<p className="error-banner">{actionError}</p>}
                >
                  <Button
                    variant="secondary"
                    onClick={() => setActionsReloadKey((key) => key + 1)}
                    data-testid="actions-retry-btn"
                  >
                    Retry
                  </Button>
                </ListState>
              )}

              {actionsState === "idle" && actions.length === 0 && (
                <ListState
                  testId="actions-empty"
                  message="No actions have been recorded yet."
                >
                  <Button
                    variant="secondary"
                    onClick={openCreateForm}
                    data-testid="empty-record-action-btn"
                  >
                    Record an action
                  </Button>
                </ListState>
              )}

              {actionsState === "idle" && actions.length > 0 && (
                <ActionList actions={actions} onEdit={openEditForm} />
              )}
            </section>
          )}

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

      {/* ── Actions Taken create/edit form (ui-spec 5.3) ────────────────── */}
      <Drawer
        open={formOpen}
        title={editingAction ? "Edit Action Taken" : "Record an Action"}
        onClose={closeActionForm}
        testId="action-form-drawer"
      >
        {conflictLatest && (
          <Callout
            variant="error"
            className="action-conflict-callout"
            data-testid="action-conflict-callout"
          >
            <p>This action was updated by someone else.</p>
            <Button
              variant="secondary"
              onClick={refreshFromConflict}
              data-testid="action-conflict-refresh"
            >
              Refresh
            </Button>
          </Callout>
        )}

        {formError && !conflictLatest && (
          <Callout
            variant="error"
            className="action-form-error"
            data-testid="action-form-error"
          >
            {formError}
          </Callout>
        )}

        <form
          className="action-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void handleSaveAction();
          }}
        >
          <div className="action-date-field">
            <TextField
              id="action-date-input"
              type="datetime-local"
              label="Action Date/Time"
              value={actionDateValue}
              onChange={(e) => {
                setActionDateValue(e.target.value);
                setFormErrors((prev) => ({ ...prev, actionDate: undefined }));
              }}
              error={formErrors.actionDate}
              errorTestId="action-date-error"
              data-testid="action-date-input"
            />
            <Button
              variant="ghost"
              className="action-date-now"
              onClick={setActionDateNow}
              data-testid="action-date-now"
            >
              Set to now
            </Button>
          </div>

          <TextArea
            id="action-description"
            label="Description"
            required
            rows={3}
            counter={{
              value: actionDescription.length,
              max: TEXT_MAX_LENGTH,
              warnAt: TEXT_WARN_LENGTH,
            }}
            value={actionDescription}
            onChange={(e) => {
              setActionDescription(e.target.value);
              setFormErrors((prev) => ({ ...prev, description: undefined }));
            }}
            error={formErrors.description}
            errorTestId="action-description-error"
            data-testid="action-description-input"
          />

          <TextArea
            id="action-result"
            label="Result"
            required
            rows={3}
            counter={{
              value: actionResult.length,
              max: TEXT_MAX_LENGTH,
              warnAt: TEXT_WARN_LENGTH,
            }}
            value={actionResult}
            onChange={(e) => {
              setActionResult(e.target.value);
              setFormErrors((prev) => ({ ...prev, result: undefined }));
            }}
            error={formErrors.result}
            errorTestId="action-result-error"
            data-testid="action-result-input"
          />

          <Toggle
            id="action-followup"
            label="Follow-up required — a note is needed when this is on."
            checked={actionFollowUp}
            onChange={(checked) => {
              setActionFollowUp(checked);
              if (!checked) {
                setFormErrors((prev) => ({
                  ...prev,
                  followUpNote: undefined,
                }));
              }
            }}
            testId="action-followup-toggle"
          />

          {actionFollowUp && (
            <TextArea
              id="action-followup-note"
              label="Follow-Up Note"
              required
              rows={2}
              counter={{
                value: actionFollowUpNote.length,
                max: TEXT_MAX_LENGTH,
                warnAt: TEXT_WARN_LENGTH,
              }}
              value={actionFollowUpNote}
              onChange={(e) => {
                setActionFollowUpNote(e.target.value);
                setFormErrors((prev) => ({ ...prev, followUpNote: undefined }));
              }}
              error={formErrors.followUpNote}
              errorTestId="action-followup-note-error"
              data-testid="action-followup-note-input"
            />
          )}

          <TextArea
            id="action-attachment-notes"
            label="Attachment Notes"
            rows={2}
            counter={{
              value: actionAttachmentNotes.length,
              max: TEXT_MAX_LENGTH,
              warnAt: TEXT_WARN_LENGTH,
            }}
            value={actionAttachmentNotes}
            onChange={(e) => {
              setActionAttachmentNotes(e.target.value);
              setFormErrors((prev) => ({
                ...prev,
                attachmentNotes: undefined,
              }));
            }}
            error={formErrors.attachmentNotes}
            errorTestId="action-attachment-notes-error"
            data-testid="action-attachment-notes-input"
          />
          <p className="action-field-hint" id="action-attachment-notes-hint">
            Which attachment or screenshot should we look at? This is a note only
            — it does not attach a file.
          </p>

          <div className="action-form-actions">
            <Button
              variant="ghost"
              onClick={closeActionForm}
              disabled={formSaving}
              data-testid="cancel-action-btn"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={formSaving}
              data-testid="save-action-btn"
            >
              Save Action
            </Button>
          </div>
        </form>
      </Drawer>

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