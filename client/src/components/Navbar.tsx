import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.js";
import Badge, { roleBadgeVariant } from "./Badge.js";
import { Clock3, FileText, CirclePlus, ListTodo, Users, ChevronDown } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  function closeMobile() {
    setMobileOpen(false);
  }

  // Close the profile menu on Escape and on outside clicks.
  useEffect(() => {
    if (!profileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    function onPointer(e: PointerEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [profileOpen]);

  async function handleLogout() {
    setProfileOpen(false);
    // logout() clears local state even on network failure, and the route
    // guards bounce a null user to /login — so always navigate, and swallow
    // the network error (nothing actionable to show on a logged-out screen).
    try {
      await logout();
    } catch {
      // Fall through to the login screen.
    }
    navigate("/login", { replace: true });
  }

  // Role-aware navigation (ui-spec.md section 4.1). My Queue is available to
  // IT Staff and Administrators (api-spec 5.1 grants the staff queue to both);
  // "User Management" is visible only to Administrators (ui-spec 4.1).
  const showMyTickets = user?.role === "REQUESTER";
  const showMyQueue =
    user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR";
  const showUserManagement = user?.role === "ADMINISTRATOR";

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-left">
          <span className="brand">
            <Clock3 />
            TokTickIT
          </span>
          <nav
            className={`nav ${mobileOpen ? "nav--open" : ""}`}
            aria-label="Primary"
          >
            {showMyTickets && (
              <NavLink
                to="/my-tickets"
                className={({ isActive }) =>
                  `nav-link ${isActive ? "nav-link--active" : ""}`
                }
                onClick={closeMobile}
              >
                <FileText size={16} />
                My Tickets
              </NavLink>
            )}
            {showMyQueue && (
              <NavLink
                to="/staff/queue"
                className={({ isActive }) =>
                  `nav-link ${isActive ? "nav-link--active" : ""}`
                }
                onClick={closeMobile}
              >
                <ListTodo size={16} />
                My Queue
              </NavLink>
            )}
            <NavLink
              to="/create-ticket"
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link--active" : ""}`
              }
              onClick={closeMobile}
            >
              <CirclePlus size={16} />
              Create Ticket
            </NavLink>
            {showUserManagement && (
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `nav-link ${isActive ? "nav-link--active" : ""}`
                }
                onClick={closeMobile}
              >
                <Users size={16} />
                User Management
              </NavLink>
            )}
          </nav>
        </div>

        <div className="header-right">
          {user && (
            <div className="profile-menu" ref={profileRef}>
              <button
                type="button"
                className="profile-button"
                aria-label={`Profile for ${user.name}`}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                onClick={() => setProfileOpen((v) => !v)}
              >
                <span className="profile-name">{user.name}</span>
                <Badge variant={roleBadgeVariant(user.role)}>
                  {roleLabel(user.role)}
                </Badge>
                <ChevronDown size={16} aria-hidden="true" />
              </button>
              {profileOpen && (
                <div className="profile-dropdown" role="menu">
                  <div className="profile-dropdown__header">
                    <span className="profile-dropdown__name">{user.name}</span>
                    <Badge variant={roleBadgeVariant(user.role)}>
                      {roleLabel(user.role)}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    className="profile-dropdown__item"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/change-password");
                    }}
                  >
                    Change Password
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="profile-dropdown__item"
                    onClick={() => void handleLogout()}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            className="hamburger"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
            title="Toggle navigation"
          >
            ☰
          </button>
        </div>
      </div>
    </header>
  );
}

function roleLabel(role: string): string {
  switch (role) {
    case "REQUESTER":
      return "Requester";
    case "IT_STAFF":
      return "IT Staff";
    case "ADMINISTRATOR":
      return "Administrator";
    default:
      return role;
  }
}
