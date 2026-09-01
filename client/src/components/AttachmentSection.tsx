import { useState, useRef, useEffect, useCallback } from "react";
import {
  uploadAttachment,
  downloadAttachment,
  removeAttachment,
  type Attachment,
} from "../api.js";
import Button from "./Button.js";
import Spinner from "./Spinner.js";
import { Upload, Download, Trash2, FileText, AlertCircle, RotateCcw } from "lucide-react";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ACTIVE = 5;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface UploadEntry {
  tempId: number;
  file: File;
}

interface Props {
  ticketId: number;
  requesterId: number;
  attachments: Attachment[];
  onUpdate: (attachments: Attachment[]) => void;
}

export default function AttachmentSection({
  ticketId,
  requesterId,
  attachments,
  onUpdate,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const removeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const [uploading, setUploading] = useState<Set<number>>(new Set());
  const [uploadErrors, setUploadErrors] = useState<Map<number, string>>(new Map());
  const [uploadFiles, setUploadFiles] = useState<Map<number, File>>(new Map());
  const [localErrors, setLocalErrors] = useState<string[]>([]);
  const [downloadErrors, setDownloadErrors] = useState<Map<number, string>>(new Map());
  const [removeDialog, setRemoveDialog] = useState<{
    attachmentId: number;
    fileName: string;
  } | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [removing, setRemoving] = useState(false);

  const activeAttachments = attachments.filter((a) => !a.isRemoved);
  const removedAttachments = attachments.filter((a) => a.isRemoved);
  const activeCount = activeAttachments.length;
  const atLimit = activeCount >= MAX_ACTIVE;

  // ── Focus trap + Escape key (ui-spec Section 7) ─────────────────────
  useEffect(() => {
    if (!removeDialog) return;
    const previousFocus = document.activeElement as HTMLElement;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = dialog.querySelectorAll<HTMLElement>(focusableSelector);
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];

    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRemoveDialog();
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
      previousFocus?.focus();
    };
  }, [removeDialog]);

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `"${file.name}" is not an allowed type. Allowed: jpg, png, webp, pdf.`;
    }
    if (file.size > MAX_SIZE) {
      return `"${file.name}" exceeds the 5 MB size limit.`;
    }
    return null;
  }

  // ── Upload (staged-flow step 4, AD-03) ──────────────────────────────
  async function doUpload(file: File, tempId: number) {
    setUploading((prev) => new Set(prev).add(tempId));
    try {
      const newAttachment = await uploadAttachment(ticketId, requesterId, file);
      onUpdate([...attachments, newAttachment]);
      setUploadFiles((prev) => {
        const next = new Map(prev);
        next.delete(tempId);
        return next;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setUploadErrors((prev) => new Map(prev).set(tempId, message));
    } finally {
      setUploading((prev) => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    }
  }

  function retryUpload(tempId: number) {
    const file = uploadFiles.get(tempId);
    if (!file) return;
    setUploadErrors((prev) => {
      const next = new Map(prev);
      next.delete(tempId);
      return next;
    });
    doUpload(file, tempId);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const errors: string[] = [];
    const validFiles: File[] = [];

    for (const file of Array.from(files)) {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    }

    setLocalErrors(errors);
    if (fileInputRef.current) fileInputRef.current.value = "";

    for (const file of validFiles) {
      const tempId = Date.now() + Math.random();
      setUploadFiles((prev) => new Map(prev).set(tempId, file));
      doUpload(file, tempId);
    }
  }

  // ── Download with "unavailable" error state (ui-spec 5.4) ──────────
  async function handleDownload(attachment: Attachment) {
    try {
      const blob = await downloadAttachment(attachment.id, requesterId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.originalFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadErrors((prev) => {
        const next = new Map(prev);
        next.delete(attachment.id);
        return next;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      setDownloadErrors((prev) => new Map(prev).set(attachment.id, message));
    }
  }

  // ── Remove dialog ───────────────────────────────────────────────────
  function openRemoveDialog(attachmentId: number, fileName: string, trigger: HTMLButtonElement) {
    removeTriggerRef.current = trigger;
    setRemoveDialog({ attachmentId, fileName });
    setRemoveReason("");
    setRemoveError("");
  }

  function closeRemoveDialog() {
    setRemoveDialog(null);
    setRemoveReason("");
    setRemoveError("");
  }

  async function confirmRemove() {
    if (!removeDialog) return;

    const reason = removeReason.trim();
    if (reason.length < 3 || reason.length > 200) {
      setRemoveError("Reason must be 3-200 characters.");
      return;
    }

    setRemoving(true);
    try {
      const updated = await removeAttachment(
        removeDialog.attachmentId,
        requesterId,
        reason
      );
      onUpdate(
        attachments.map((a) => (a.id === updated.id ? updated : a))
      );
      closeRemoveDialog();
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="attachment-section" data-testid="attachment-section">
      <div className="attachment-section-header">
        <h2 className="ticket-detail-section-title">
          Attachments ({activeCount})
        </h2>
        {!atLimit && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              multiple
              onChange={handleFileSelect}
              className="sr-only"
              data-testid="attachment-file-input"
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              data-testid="add-attachment-btn"
            >
              <Upload size={14} />
              Add attachment
            </Button>
          </>
        )}
        {atLimit && (
          <span className="attachment-hint" data-testid="attachment-limit-hint">
            Maximum of 5 active attachments reached.
          </span>
        )}
      </div>

      {localErrors.length > 0 && (
        <div className="attachment-local-errors" data-testid="local-errors">
          {localErrors.map((err, i) => (
            <div key={i} className="attachment-local-error">
              <AlertCircle size={14} />
              {err}
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 && uploading.size === 0 && (
        <p className="text-muted" data-testid="no-attachments">
          No attachments.
        </p>
      )}

      <ul className="attachment-list" data-testid="attachment-list">
        {/* ── Active rows ──────────────────────────────────────────── */}
        {activeAttachments.map((a) => {
          const dlError = downloadErrors.get(a.id);
          return (
            <li
              key={a.id}
              className={`attachment-item ${dlError ? "attachment-item--error" : ""}`}
              data-testid={`attachment-active-${a.id}`}
            >
              <FileText size={16} className="attachment-icon" />
              <span className="attachment-name">{a.originalFileName}</span>
              <span className="attachment-size">{formatFileSize(a.fileSize)}</span>
              {dlError ? (
                <div className="attachment-actions">
                  <span className="attachment-error-text">{dlError}</span>
                  <button
                    className="attachment-action-btn"
                    onClick={() => handleDownload(a)}
                    aria-label={`Retry download ${a.originalFileName}`}
                    title="Retry"
                    data-testid={`retry-download-btn-${a.id}`}
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              ) : (
                <div className="attachment-actions">
                  <button
                    className="attachment-action-btn"
                    onClick={() => handleDownload(a)}
                    aria-label={`Download ${a.originalFileName}`}
                    title={`Download ${a.originalFileName}`}
                    data-testid={`download-btn-${a.id}`}
                  >
                    <Download size={14} />
                  </button>
                  <button
                    className="attachment-action-btn attachment-action-btn--destructive"
                    onClick={(e) => openRemoveDialog(a.id, a.originalFileName, e.currentTarget)}
                    aria-label="Remove"
                    title="Remove"
                    data-testid={`remove-btn-${a.id}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </li>
          );
        })}

        {/* ── Uploading rows (ui-spec 5.4: spinner + "Uploading…") ── */}
        {Array.from(uploading).map((tempId) => (
          <li
            key={tempId}
            className="attachment-item attachment-item--uploading"
            data-testid="uploading-attachment"
          >
            <Spinner />
            <span className="attachment-name">Uploading&hellip;</span>
          </li>
        ))}

        {/* ── Upload error rows with Retry (ui-spec 5.4) ──────────── */}
        {Array.from(uploadErrors.entries()).map(([tempId, error]) => (
          <li
            key={tempId}
            className="attachment-item attachment-item--error"
            data-testid="upload-error"
          >
            <AlertCircle size={16} className="attachment-error-icon" />
            <span className="attachment-error-text">{error}</span>
            <div className="attachment-actions">
              <button
                className="attachment-action-btn"
                onClick={() => retryUpload(tempId)}
                aria-label="Retry upload"
                title="Retry"
                data-testid={`retry-upload-btn-${tempId}`}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </li>
        ))}

        {/* ── Removed rows (ui-spec 5.4: muted, disabled download) ── */}
        {removedAttachments.map((a) => (
          <li
            key={a.id}
            className="attachment-item attachment-item--removed"
            data-testid={`attachment-removed-${a.id}`}
          >
            <FileText size={16} className="attachment-icon" />
            <span className="attachment-name">{a.originalFileName}</span>
            <span className="attachment-size">{formatFileSize(a.fileSize)}</span>
            <span className="attachment-removed-info">
              Removed {a.removedAt ? formatDate(a.removedAt) : ""} &mdash;{" "}
              {a.removalReason}
            </span>
            <div className="attachment-actions">
              <button
                className="attachment-action-btn"
                disabled
                title="Removed attachments cannot be downloaded"
                aria-label={`Download ${a.originalFileName} (removed)`}
                data-testid={`download-disabled-btn-${a.id}`}
              >
                <Download size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* ── Remove confirm dialog (ui-spec Section 7: focus trap + Escape) ── */}
      {removeDialog && (
        <div className="remove-dialog-overlay" data-testid="remove-dialog">
          <div className="remove-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="remove-dialog-title">
            <h3 id="remove-dialog-title">Remove Attachment</h3>
            <p>
              Are you sure you want to remove &ldquo;{removeDialog.fileName}
              &rdquo;?
            </p>
            <div className="field-group">
              <label htmlFor="remove-reason" className="field-label">
                Reason <span className="required-mark">*</span>
              </label>
              <textarea
                id="remove-reason"
                className="field-input"
                rows={3}
                value={removeReason}
                onChange={(e) => {
                  setRemoveReason(e.target.value);
                  setRemoveError("");
                }}
                placeholder="Enter a reason (3-200 characters)"
                aria-describedby={removeError ? "remove-reason-error" : undefined}
                aria-invalid={!!removeError}
                data-testid="remove-reason-input"
              />
              {removeError && (
                <div className="field-error" id="remove-reason-error" data-testid="remove-error">
                  {removeError}
                </div>
              )}
            </div>
            <div className="remove-dialog-actions">
              <Button
                variant="ghost"
                onClick={closeRemoveDialog}
                disabled={removing}
                data-testid="cancel-remove-btn"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmRemove}
                loading={removing}
                disabled={
                  removeReason.trim().length < 3 ||
                  removeReason.trim().length > 200
                }
                className="btn-destructive"
                data-testid="confirm-remove-btn"
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
