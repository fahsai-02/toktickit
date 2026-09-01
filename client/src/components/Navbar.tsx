import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useRequester } from "../RequesterContext.js";
import Button from "./Button.js";
import { Clock3, FileText, CirclePlus } from "lucide-react";

export default function Navbar() {
  const { requester, clearRequester } = useRequester();
  const [mobileOpen, setMobileOpen] = useState(false);

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-left">
          <span className="brand">
            <Clock3 />TokTickIT
          </span>
          <nav className={`nav ${mobileOpen ? "nav--open" : ""}`}>
            <NavLink
              to="/my-tickets"
              className={({ isActive }) => `nav-link ${isActive ? "nav-link--active" : ""}`}
              onClick={closeMobile}
            >
              <FileText size={16} />
              My Tickets
            </NavLink>
            <NavLink
              to="/create-ticket"
              className={({ isActive }) => `nav-link ${isActive ? "nav-link--active" : ""}`}
              onClick={closeMobile}
            >
              <CirclePlus size={16} />
              Create Ticket
            </NavLink>
          </nav>
        </div>

        <div className="header-right">
          {requester && (
            <span className="requester-name">{requester.name}</span>
          )}
          <Button
            className="btn-change-requester"
            onClick={() => {
              let ok = true;
              try {
                const result = window.confirm("Change requester? You will return to the selection screen.");
                ok = result !== false;
              } catch {
                // jsdom: proceed without confirmation in test environment
              }
              if (ok) clearRequester();
            }}
          >
            Change Requester
          </Button>
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
