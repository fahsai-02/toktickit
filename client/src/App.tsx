import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import type { ReactElement } from "react";
import { useAuth } from "./AuthContext.js";
import type { UserRole } from "./api.js";
import Login from "./Login.js";
import ChangePassword from "./ChangePassword.js";
import AppShell from "./AppShell.js";
import MyTickets from "./MyTickets.js";
import CreateTicket from "./CreateTicket.js";
import TicketDetail from "./TicketDetail.js";
import StaffTicketQueue from "./StaffTicketQueue.js";
import StaffTicketDetail from "./StaffTicketDetail.js";
import Spinner from "./components/Spinner.js";

/** Landing page: sends each user to the default screen for their state. */
function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="selection-page" data-testid="app-loading">
        <Spinner />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (user.role === "REQUESTER") return <Navigate to="/my-tickets" replace />;
  // ui-spec section 4.1: IT Staff and Admins land on the staff queue; the
  // admin user-management screen is added at release time (ui-spec 4.4).
  if (user.role === "IT_STAFF" || user.role === "ADMINISTRATOR") {
    return <Navigate to="/staff/queue" replace />;
  }
  return <Navigate to="/create-ticket" replace />;
}

/**
 * Guard for screens that require a signed-in user whose password is
 * already changed. Renders a full-page spinner while the initial
 * GET /api/auth/me check is in flight so a page refresh never flashes
 * the login screen for an authenticated user.
 */
function RequireAuth({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="selection-page" data-testid="app-loading">
        <Spinner />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }
  return children;
}

/** Guard for /change-password: reachable when signed in (forced or voluntary). */
function RequireSignedIn({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="selection-page" data-testid="app-loading">
        <Spinner />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/**
 * Role guard for screens that belong to specific roles (ui-spec.md
 * section 4.1). Disallowed roles bounce to "/" so HomeRedirect can send
 * them to their own default — never a dead end or a leaked screen.
 */
function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[];
  children: ReactElement;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="selection-page" data-testid="app-loading">
        <Spinner />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

/** Public-only screen: signed-in users are sent into the app (or forced change). */
function RequireAnonymous({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="selection-page" data-testid="app-loading">
        <Spinner />
      </div>
    );
  }
  if (user) {
    return (
      <Navigate
        to={user.mustChangePassword ? "/change-password" : "/"}
        replace
      />
    );
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RequireAnonymous>
            <Login />
          </RequireAnonymous>
        }
      />
      <Route
        path="/change-password"
        element={
          <RequireSignedIn>
            <ChangePassword />
          </RequireSignedIn>
        }
      />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route
          path="/my-tickets"
          element={
            <RequireRole roles={["REQUESTER"]}>
              <MyTickets />
            </RequireRole>
          }
        />
        <Route
          path="/tickets/:ticketId"
          element={
            <RequireRole roles={["REQUESTER"]}>
              <TicketDetail />
            </RequireRole>
          }
        />
        {/* Create Ticket is granted to every role (ui-spec.md section 4.1). */}
        <Route path="/create-ticket" element={<CreateTicket />} />
        {/* IT Staff Ticket Queue (Issue 19): Admins may also open it
            (issue 19 AC — api-spec 5.1 grants the staff queue to both). */}
        <Route
          path="/staff/queue"
          element={
            <RequireRole roles={["IT_STAFF", "ADMINISTRATOR"]}>
              <StaffTicketQueue />
            </RequireRole>
          }
        />
        {/* Placeholder so a row click lands somewhere instead of bouncing
            back to the queue (Issue 19). Full staff detail: later issue. */}
        <Route
          path="/staff/tickets/:ticketId"
          element={
            <RequireRole roles={["IT_STAFF", "ADMINISTRATOR"]}>
              <StaffTicketDetail />
            </RequireRole>
          }
        />
        {/* TODO(Issue 21): /admin/users — Administrator User Management. */}
      </Route>
      <Route path="/" element={<HomeRedirect />} />
      {/* /select-requester was removed in Lab 3 (Issue 17) — anything
          unknown falls back to the role default. */}
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
