import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchCategories,
  fetchRelatedSystems,
  createTicket,
  ApiError,
  type Category,
  type RelatedSystem,
  type RequestedPriority,
  type Ticket,
} from "./api.js";
import { useRequester } from "./RequesterContext.js";
import Button from "./components/Button.js";
import SelectField from "./components/SelectField.js";
import TextField from "./components/TextField.js";
import TextArea from "./components/TextArea.js";
import ReadOnlyField from "./components/ReadOnlyField.js";
import Callout from "./components/Callout.js";
import Spinner from "./components/Spinner.js";

const PRIORITIES: RequestedPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 5;

interface StagedFile {
  id: number;
  name: string;
  size: number;
}

let stagedFileSeq = 0;

interface FieldErrors {
  category?: string;
  relatedSystem?: string;
  requestedPriority?: string;
  summary?: string;
  description?: string;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function fileExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx + 1).toLowerCase();
}

export default function CreateTicket() {
  const navigate = useNavigate();
  const { requester } = useRequester();

  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [systemId, setSystemId] = useState<number | null>(null);
  const [priority, setPriority] = useState<RequestedPriority | "">("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<string[]>([]);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successTicket, setSuccessTicket] = useState<Ticket | null>(null);

  const ticketDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function loadReferenceData() {
    setDataLoading(true);
    setLoadError(null);
    try {
      const [cats, systems] = await Promise.all([
        fetchCategories(),
        fetchRelatedSystems(),
      ]);
      setCategories(cats);
      setRelatedSystems(systems);
    } catch {
      setLoadError(
        "Could not load categories and related systems. Please try again."
      );
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => {
    void loadReferenceData();
  }, []);

  useEffect(() => {
    if (categoryId === null) {
      setSystemId(null);
      return;
    }
    let cancelled = false;
    setSystemId(null);
    fetchRelatedSystems(categoryId)
      .then((systems) => {
        if (!cancelled) setRelatedSystems(systems);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load related systems.");
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  if (!requester) {
    return null;
  }
  const currentRequester = requester;

  function handleFileChange(files: FileList | null) {
    if (!files) return;
    const nextRejected: string[] = [];
    const accepted: StagedFile[] = [];

    for (const file of Array.from(files)) {
      const ext = fileExtension(file.name);
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        nextRejected.push(`${file.name}: only JPG, PNG, WEBP, or PDF allowed`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        nextRejected.push(`${file.name}: file exceeds 5 MB`);
        continue;
      }
      accepted.push({
        id: ++stagedFileSeq,
        name: file.name,
        size: file.size,
      });
    }

    if (stagedFiles.length + accepted.length > MAX_FILES) {
      setSubmitError(
        `You can add up to ${MAX_FILES} files. Remove a file to add another.`
      );
      return;
    }

    if (accepted.length > 0) {
      setStagedFiles((prev) => [...prev, ...accepted]);
    }
    if (nextRejected.length > 0) {
      setRejectedFiles(nextRejected);
    }
  }

  function removeStagedFile(id: number) {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (categoryId === null) errors.category = "Category is required.";
    if (systemId === null) errors.relatedSystem = "Related system is required.";
    if (priority === "") errors.requestedPriority = "Priority is required.";
    if (summary.trim().length === 0 || summary.trim().length > 120) {
      errors.summary = "Summary is required (1-120 characters).";
    }
    if (description.trim().length === 0 || description.trim().length > 2000) {
      errors.description = "Description is required (1-2000 characters).";
    }
    return errors;
  }

  async function handleSubmit() {
    if (submitting) return;
    const errors = validate();
    setFieldErrors(errors);
    setSubmitError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const ticket = await createTicket({
        requesterId: currentRequester.id,
        categoryId: categoryId as number,
        relatedSystemId: systemId as number,
        requestedPriority: priority as RequestedPriority,
        summary: summary.trim(),
        description: description.trim(),
      });
      setSuccessTicket(ticket);
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setFieldErrors({
          category: err.fields.categoryId,
          relatedSystem: err.fields.relatedSystemId,
          requestedPriority: err.fields.requestedPriority,
          summary: err.fields.summary,
          description: err.fields.description,
        });
      }
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Could not save your ticket. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setCategoryId(null);
    setSystemId(null);
    setPriority("");
    setSummary("");
    setDescription("");
    setStagedFiles([]);
    setRejectedFiles([]);
    setFieldErrors({});
    setSubmitError(null);
    setSuccessTicket(null);
  }

  if (successTicket) {
    return (
      <div className="container create-ticket">
        <Callout variant="success">
          <strong>
            Ticket created: {successTicket.ticketNumber}
          </strong>
          <p>
            Your ticket has been submitted. The support team will look into it.
          </p>
        </Callout>
        <div className="create-actions">
          <Button variant="secondary" disabled>
            View ticket (coming soon)
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate("/my-tickets")}
            data-testid="go-to-my-tickets"
          >
            Go to My Tickets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container create-ticket">
      <h1 className="page-title">Create Ticket</h1>

      {loadError && (
        <Callout 
          variant="error" 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
        >
          <span>{loadError}</span>
          <Button variant="secondary" onClick={() => void loadReferenceData()}> Retry </Button>
        </Callout>
      )}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <div className="create-readonly-row">
          <ReadOnlyField
            id="readonly-ticket-number"
            label="Ticket Number"
            value={
              dataLoading ? "Loading…" : "Generated upon submission"
            }
          />
          <ReadOnlyField
            id="readonly-ticket-date"
            label="Ticket Date"
            value={ticketDate}
          />
          <ReadOnlyField
            id="readonly-requester"
            label="Requester"
            value={currentRequester.name}
          />
        </div>

        <div className="create-classification">
          <SelectField
            id="category"
            label="Category"
            required
            placeholder="— Select category —"
            disabled={dataLoading}
            data-testid="category"
            value={categoryId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              setCategoryId(val ? Number(val) : null);
            }}
            error={fieldErrors.category}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />

          <SelectField
            id="relatedSystem"
            label="Related System"
            required
            placeholder="— Select system —"
            disabled={dataLoading || categoryId === null}
            data-testid="relatedSystem"
            value={systemId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              setSystemId(val ? Number(val) : null);
            }}
            error={fieldErrors.relatedSystem}
            options={relatedSystems.map((s) => ({
              value: s.id,
              label: s.name,
            }))}
          />

          <SelectField
            id="priority"
            label="Requested Priority"
            required
            placeholder="— Select priority —"
            data-testid="priority"
            disabled={dataLoading}
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as RequestedPriority | "")
            }
            error={fieldErrors.requestedPriority}
            options={PRIORITIES.map((p) => ({ value: p, label: p }))}
          />
        </div>

        <TextField
          id="summary"
          label="Summary"
          required
          maxLength={120}
          placeholder="Brief summary of the issue"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          error={fieldErrors.summary}
          counter={{ value: summary.length, max: 120 }}
          data-testid="summary"
        />

        <TextArea
          id="description"
          label="Description"
          required
          maxLength={2000}
          placeholder="Describe the issue in detail"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={fieldErrors.description}
          counter={{ value: description.length, max: 2000 }}
          data-testid="description"
        />

        <div className="attach-zone">
          <label className="attach-label" htmlFor="attachments">
            Attachments
          </label>
          <label className="attach-drop" htmlFor="attachments">
            <span>Drag files here or browse</span>
            <span className="attach-hint">
              JPG, PNG, WEBP, PDF · max 5 MB · up to 5 files (not uploaded yet)
            </span>
          </label>
          <input
            id="attachments"
            type="file"
            multiple
            data-testid="file-input"
            onChange={(e) => {
              handleFileChange(e.target.files);
              e.target.value = "";
            }}
          />

          {rejectedFiles.length > 0 && (
            <ul className="rejected-list">
              {rejectedFiles.map((msg) => (
                <li key={msg} className="rejected-item">
                  {msg}
                </li>
              ))}
            </ul>
          )}

          {stagedFiles.length > 0 && (
            <ul className="staged-list">
              {stagedFiles.map((f) => (
                <li key={f.id} className="staged-chip">
                  <span className="staged-name">{f.name}</span>
                  <span className="staged-size">{formatBytes(f.size)}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${f.name} (file #${f.id})`}
                    className="staged-remove"
                    onClick={() => removeStagedFile(f.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {submitError && (
          <Callout variant="error" data-testid="submit-error">
            <div className="callout-dismiss">
              <span>{submitError}</span>
              <button
                type="button"
                className="callout-close"
                aria-label="Dismiss error"
                onClick={() => setSubmitError(null)}
              >
                ×
              </button>
            </div>
          </Callout>
        )}

        <div className="create-actions">
          <Button
            variant="ghost"
            type="button"
            onClick={() => navigate("/my-tickets")}
            data-testid="cancel"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            loading={submitting}
            disabled={submitting}
            onClick={() => void handleSubmit()}
            data-testid="submit-ticket"
          >
            Submit Ticket
          </Button>
        </div>
      </form>
    </div>
  );
}
