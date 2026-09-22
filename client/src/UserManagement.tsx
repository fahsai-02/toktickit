import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Plus, SearchX, ShieldAlert, SlidersHorizontal, Users } from "lucide-react";
import { useAuth } from "./AuthContext.js";
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetAdminPassword,
  ApiError,
  type AdminUser,
  type UserRole,
} from "./api.js";
import Button from "./components/Button.js";
import Badge, { roleBadgeVariant, activeBadgeVariant } from "./components/Badge.js";
import TextField from "./components/TextField.js";
import SelectField from "./components/SelectField.js";
import Toggle from "./components/Toggle.js";
import Drawer from "./components/Drawer.js";
import ConfirmDialog from "./components/ConfirmDialog.js";
import Callout from "./components/Callout.js";
import Spinner from "./components/Spinner.js";

// Administrator User Management (Issue 21). Contract: ui-spec.md section 5.6;
// api-spec.md section 6; specification FR-40..FR-48. Every safety rule is
// enforced by the server — this page only surfaces its messages.

type ListState = "loading" | "empty" | "no-results" | "error" | "idle";
type DrawerState = { mode: "create" } | { mode: "edit"; user: AdminUser } | null;

const ROLE_OPTIONS = [
  { value: "REQUESTER", label: "Requester" },
  { value: "IT_STAFF", label: "IT Staff" },
  { value: "ADMINISTRATOR", label: "Administrator" },
] satisfies Array<{ value: UserRole; label: string }>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormState {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  initialPassword: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  role: "REQUESTER",
  isActive: true,
  initialPassword: "",
};

function roleLabel(role: string): string {
  return ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role;
}

export default function UserManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "ADMINISTRATOR";

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [listState, setListState] = useState<ListState>("loading");
  const [listError, setListError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<{ search: string; role: string }>({
    search: "",
    role: "",
  });
  const [successMessage, setSuccessMessage] = useState("");

  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordError, setResetPasswordError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetSaving, setResetSaving] = useState(false);

  const [confirmTarget, setConfirmTarget] = useState<AdminUser | null>(null);
  const [confirming, setConfirming] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(0);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  const loadUsers = useCallback(async () => {
    const reqId = ++abortRef.current;
    setListState("loading");
    setListError("");
    try {
      const result = await fetchAdminUsers({
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.role ? { role: filters.role as UserRole } : {}),
      });
      if (reqId !== abortRef.current) return;

      setUsers(result);
      if (result.length === 0) {
        setListState(filters.search || filters.role ? "no-results" : "empty");
      } else {
        setListState("idle");
      }
    } catch (err) {
      if (reqId !== abortRef.current) return;
      if (err instanceof ApiError) {
        setListError(err.message);
      } else {
        setListError("An unexpected error occurred.");
      }
      setListState("error");
    }
  }, [filters]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadUsers();
  }, [loadUsers, isAdmin]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: value }));
    }, 300);
  };

  const clearFilters = () => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    setSearchInput("");
    setFilters({ search: "", role: "" });
    // The `filters` change re-runs the load effect with empty params.
  };

  const handleRoleChange = (value: string) => {
    setFilters((prev) => ({ ...prev, role: value }));
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError("");
    setResetOpen(false);
    setResetPassword("");
    setResetPasswordError("");
    setResetSuccess("");
    setDrawer({ mode: "create" });
  };

  const openEdit = (target: AdminUser) => {
    setForm({
      name: target.name,
      email: target.email,
      role: target.role,
      isActive: target.isActive,
      initialPassword: "",
    });
    setFieldErrors({});
    setFormError("");
    setResetOpen(false);
    setResetPassword("");
    setResetPasswordError("");
    setResetSuccess("");
    setDrawer({ mode: "edit", user: target });
  };

  const closeDrawer = () => {
    if (saving || resetSaving) return;
    setDrawer(null);
  };

  async function handleSave() {
    if (!drawer) return;
    const errors: Record<string, string> = {};
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name) {
      errors.name = "Full name is required.";
    } else if (name.length > 100) {
      errors.name = "Full name must be at most 100 characters.";
    }
    if (!email || !EMAIL_RE.test(email)) {
      errors.email = "A valid email address is required.";
    }
    if (drawer.mode === "create" && !form.initialPassword) {
      errors.initialPassword = "An initial password is required.";
    }
    if (Object.keys(errors).length > 0) {
      // Client-side validation failure: never call the API.
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setFormError("");
    setFieldErrors({});
    try {
      if (drawer.mode === "create") {
        await createAdminUser({
          name,
          email,
          role: form.role,
          isActive: form.isActive,
          initialPassword: form.initialPassword,
        });
        setSuccessMessage("User created successfully.");
      } else {
        await updateAdminUser(drawer.user.id, {
          name,
          email,
          role: form.role,
          isActive: form.isActive,
        });
        setSuccessMessage("User updated successfully.");
      }
      setDrawer(null);
      void loadUsers();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields) setFieldErrors(err.fields);
        else setFormError(err.message);
      } else {
        setFormError("An unexpected error occurred.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!drawer || drawer.mode !== "edit") return;
    if (!resetPassword) {
      setResetPasswordError("An initial password is required.");
      return;
    }
    setResetSaving(true);
    setResetPasswordError("");
    setResetSuccess("");
    try {
      await resetAdminPassword(drawer.user.id, resetPassword);
      setResetSuccess(resetAdminPasswordSuccessMessage());
    } catch (err) {
      if (err instanceof ApiError) {
        setResetPasswordError(err.fields?.initialPassword ?? err.message);
      } else {
        setResetPasswordError("An unexpected error occurred.");
      }
    } finally {
      setResetSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!confirmTarget) return;
    // Active user → deactivate; inactive user → reactivate. Both go through
    // the confirm dialog; the server enforces the self/last-admin guards and
    // its message is surfaced here on failure (409/403).
    const nextActive = !confirmTarget.isActive;
    setConfirming(true);
    try {
      await updateAdminUser(confirmTarget.id, { isActive: nextActive });
      setConfirmTarget(null);
      setDrawer(null);
      setSuccessMessage("User updated successfully.");
      void loadUsers();
    } catch (err) {
      // The drawer stays open and shows the server's safety message
      // (e.g. self-deactivation 403 / last-admin 409).
      setConfirmTarget(null);
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("An unexpected error occurred.");
      }
    } finally {
      setConfirming(false);
    }
  }

  if (user && !isAdmin) {
    return (
      <div className="access-denied" data-testid="forbidden-state">
        <ShieldAlert size={48} strokeWidth={1.5} aria-hidden="true" />
        <h2>You don&apos;t have access to this page.</h2>
        <p>User management is reserved for Administrators only.</p>
        <Button variant="secondary" onClick={() => navigate("/")}>
          Go to Home
        </Button>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="container my-tickets" data-testid="user-management-page">
      <div className="my-tickets-toolbar">
        <h1 className="page-title">User Management</h1>
        <Button
          onClick={openCreate}
          data-testid="create-user-btn"
        >
          <Plus size={16} aria-hidden="true" />
          Create User
        </Button>
      </div>

      {successMessage && (
        <Callout variant="success" data-testid="page-success">
          {successMessage}
        </Callout>
      )}

      <div className="queue-toolbar">
        <div className="filter-search">
          <label htmlFor="user-search-input" className="field-label">
            Search
          </label>
          <input
            id="user-search-input"
            type="text"
            className="field-input"
            placeholder="Search users..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            data-testid="user-search-input"
          />
        </div>
        {/* ui-spec 5.6: "Filters" button reveals the role filter dropdown.
            Same icon treatment as the staff queue (ui-spec 5.4). */}
        <Button
          variant="secondary"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          data-testid="filters-toggle"
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filters
        </Button>
        {filtersOpen && (
          <div
            className="filter-card filter-card--overlay"
            data-testid="filter-card"
          >
            <div className="filter-select">
              <label htmlFor="user-role-filter" className="field-label">
                Role
              </label>
              <select
                id="user-role-filter"
                className="field-select"
                value={filters.role}
                onChange={(e) => handleRoleChange(e.target.value)}
                data-testid="filter-role"
              >
                <option value="">All roles</option>
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {((filters.role || searchInput) && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                data-testid="clear-filters"
              >
                Clear Filters
              </Button>
            ))}
      </div>

      {listState === "loading" && (
        <div className="list-state" data-testid="loading-state">
          <Spinner />
          <span>Loading users...</span>
        </div>
      )}

      {listState === "error" && (
        <div className="list-state list-state--error" data-testid="error-state">
          <p className="error-banner">{listError}</p>
          <Button
            variant="secondary"
            onClick={() => void loadUsers()}
            data-testid="retry-btn"
          >
            Retry
          </Button>
        </div>
      )}

      {listState === "empty" && (
        <div className="list-state" data-testid="empty-state">
          <Users size={48} strokeWidth={1.5} />
          <p>No users found.</p>
        </div>
      )}

      {listState === "no-results" && (
        <div className="list-state" data-testid="no-results-state">
          <SearchX size={48} strokeWidth={1.5} />
          <p>No results match your search.</p>
          <Button variant="secondary" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      )}

      {(listState === "idle" || listState === "error") && users.length > 0 && (
        <>
          <div className="user-table-desktop" data-testid="user-table-desktop">
            <table className="user-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Edit</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="user-row">
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <Badge variant={roleBadgeVariant(u.role)}>
                        {roleLabel(u.role)}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={activeBadgeVariant(u.isActive)}>
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="secondary"
                        onClick={() => openEdit(u)}
                        data-testid={`edit-user-${u.id}`}
                      >
                        <Pencil size={13} aria-hidden="true" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="user-cards-mobile" data-testid="user-cards-mobile">
            {users.map((u) => (
              <div key={u.id} className="user-card" data-testid={`user-card-${u.id}`}>
                <div className="user-card-row">
                  <span className="user-card-name">{u.name}</span>
                  <Badge variant={roleBadgeVariant(u.role)}>
                    {roleLabel(u.role)}
                  </Badge>
                </div>
                <span className="user-card-email">{u.email}</span>
                <div className="user-card-row">
                  <Badge variant={activeBadgeVariant(u.isActive)}>
                    {u.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {/* Distinct testid so jsdom (which ignores media queries)
                      never exposes two identical `edit-user-{id}` buttons. */}
                  <Button
                    variant="secondary"
                    onClick={() => openEdit(u)}
                    data-testid={`edit-user-mobile-${u.id}`}
                  >
                    <Pencil size={13} aria-hidden="true" />
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Create / Edit drawer (ui-spec 5.6) ─────────────────────────── */}
      <Drawer
        open={drawer !== null}
        title={drawer?.mode === "create" ? "Create New User" : "Edit User"}
        onClose={closeDrawer}
        testId="user-drawer"
      >
        {drawer && (
          <div className="drawer-form">
            {formError && (
              <Callout variant="error" data-testid="form-error">
                {formError}
              </Callout>
            )}

            <TextField
              id="user-name"
              label="Full Name"
              required
              value={form.name}
              error={fieldErrors.name}
              errorTestId="name-error"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="user-name"
            />
            <TextField
              id="user-email"
              label="Email Address"
              required
              type="email"
              value={form.email}
              error={fieldErrors.email}
              errorTestId="email-error"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              data-testid="user-email"
            />
            <SelectField
              id="user-role"
              label="Role"
              required
              options={ROLE_OPTIONS}
              value={form.role}
              error={fieldErrors.role}
              errorTestId="role-error"
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as UserRole })
              }
              data-testid="user-role"
            />
            <Toggle
              id="user-active"
              label="Active"
              checked={form.isActive}
              onChange={(checked) => setForm({ ...form, isActive: checked })}
              testId="active-toggle"
            />

            {drawer.mode === "create" ? (
              <>
                <TextField
                  id="user-initial-password"
                  label="Initial Password"
                  required
                  type="password"
                  placeholder="Enter initial password"
                  value={form.initialPassword}
                  error={fieldErrors.initialPassword}
                  errorTestId="initial-password-error"
                  onChange={(e) =>
                    setForm({ ...form, initialPassword: e.target.value })
                  }
                  data-testid="initial-password"
                />
                <p className="field-hint">
                  User will be required to change password on first login.
                </p>
              </>
            ) : (
              <div className="drawer-section" data-testid="password-reset-section">
                {!resetOpen ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setResetOpen(true);
                      setResetPasswordError("");
                      setResetSuccess("");
                    }}
                    data-testid="open-reset-password"
                  >
                    Set New Initial Password
                  </Button>
                ) : (
                  <div className="password-reset-form">
                    <TextField
                      id="user-reset-password"
                      label="New Initial Password"
                      required
                      type="password"
                      placeholder="Enter initial password"
                      value={resetPassword}
                      error={resetPasswordError}
                      errorTestId="reset-password-error"
                      onChange={(e) => setResetPassword(e.target.value)}
                      data-testid="reset-password"
                    />
                    {resetSuccess && (
                      <Callout variant="success" data-testid="reset-success">
                        {resetSuccess}
                      </Callout>
                    )}
                    <div className="drawer-actions-row">
                      <Button
                        loading={resetSaving}
                        disabled={resetSaving}
                        onClick={() => void handleResetPassword()}
                        data-testid="save-reset-password"
                      >
                        Set Password
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={resetSaving}
                        onClick={() => {
                          setResetOpen(false);
                          setResetPassword("");
                          setResetPasswordError("");
                        }}
                        data-testid="cancel-reset-password"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="drawer-actions">
              <Button
                loading={saving}
                onClick={() => void handleSave()}
                data-testid="save-user-btn"
              >
                Save User
              </Button>
              {drawer.mode === "edit" &&
                (drawer.user.isActive ? (
                  <Button
                    className="btn-destructive"
                    disabled={saving}
                    onClick={() => setConfirmTarget(drawer.user)}
                    data-testid="deactivate-user-btn"
                  >
                    Deactivate User
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    disabled={saving}
                    onClick={() => setConfirmTarget(drawer.user)}
                    data-testid="activate-user-btn"
                  >
                    Activate User
                  </Button>
                ))}
              <Button
                variant="ghost"
                onClick={closeDrawer}
                data-testid="cancel-user-btn"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* ── Deactivate / activate confirmation dialog (ui-spec 5.6) ─────────── */}
      <ConfirmDialog
        open={confirmTarget !== null}
        title={
          confirmTarget
            ? confirmTarget.isActive
              ? `Are you sure you want to deactivate ${confirmTarget.name}?`
              : `Are you sure you want to activate ${confirmTarget.name}?`
            : ""
        }
        confirmLabel={confirmTarget?.isActive ? "Deactivate" : "Activate"}
        cancelLabel="Cancel"
        destructive={confirmTarget?.isActive ?? false}
        loading={confirming}
        testId="deactivate-confirm-dialog"
        onConfirm={() => void handleToggleActive()}
        onCancel={() => {
          if (!confirming) setConfirmTarget(null);
        }}
      >
        <p>
          {confirmTarget?.isActive
            ? "This user will no longer be able to log in."
            : "This user will be able to log in again."}
        </p>
      </ConfirmDialog>
    </div>
  );
}

function resetAdminPasswordSuccessMessage(): string {
  return "Password reset successfully. User must change password at next login.";
}