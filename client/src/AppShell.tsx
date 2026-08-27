import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar.js";

export default function AppShell() {
  return (
    <div className="app">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
