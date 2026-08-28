import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useRequester } from "../RequesterContext.js";
import Button from "./Button.js";

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
          <span className="brand">TokTickIT</span>
          <nav className={`nav ${mobileOpen ? "nav--open" : ""}`}>
            <NavLink
              to="/my-tickets"
              className={({ isActive }) => `nav-link ${isActive ? "nav-link--active" : ""}`}
              onClick={closeMobile}
            >
              My Tickets
            </NavLink>
            <NavLink
              to="/create-ticket"
              className={({ isActive }) => `nav-link ${isActive ? "nav-link--active" : ""}`}
              onClick={closeMobile}
            >
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
            onClick={clearRequester}
          >
            Change Requester
          </Button>
          <button
            type="button"
            className="hamburger"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
            title="Toggle navigation"
          >
            ☰
          </button>
        </div>
      </div>
    </header>
  );
}
