import { Routes, Route, Navigate } from "react-router-dom";
import { useRequester } from "./RequesterContext.js";
import RequesterSelection from "./RequesterSelection.js";
import AppShell from "./AppShell.js";
import MyTickets from "./MyTickets.js";
import CreateTicket from "./CreateTicket.js";

export default function App() {
  const { requester } = useRequester();

  if (!requester) {
    return (
      <Routes>
        <Route path="/select-requester" element={<RequesterSelection />} />
        <Route path="*" element={<Navigate to="/select-requester" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/my-tickets" element={<MyTickets />} />
        <Route path="/create-ticket" element={<CreateTicket />} />
        <Route path="/select-requester" element={<Navigate to="/my-tickets" replace />} />
        <Route path="/" element={<Navigate to="/my-tickets" replace />} />
        <Route path="*" element={<Navigate to="/my-tickets" replace />} />
      </Route>
    </Routes>
  );
}
