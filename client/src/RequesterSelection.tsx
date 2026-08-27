import { useEffect, useState } from "react";
import { fetchRequesters, type Requester } from "./api.js";
import { useRequester } from "./RequesterContext.js";
import Spinner from "./components/Spinner.js";
import SelectField from "./components/SelectField.js";
import Button from "./components/Button.js";

type UiState = "loading" | "empty" | "error" | "idle";

export default function RequesterSelection() {
  const { selectRequester } = useRequester();
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [state, setState] = useState<UiState>("loading");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  async function load() {
    setState("loading");
    try {
      const data = await fetchRequesters();
      setRequesters(data);
      setState(data.length === 0 ? "empty" : "idle");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function handleContinue() {
    const found = requesters.find((r) => r.id === selectedId);
    if (found) selectRequester(found);
  }

  return (
    <div className="selection-page">
      <div className="selection-card">
        <h1 className="selection-title">TokTickIT</h1>
        <p className="selection-subtitle">IT Service Desk</p>

        <p className="selection-info">
          This is a development testing mechanism to simulate different
          requesters. It is <strong>not</strong> a login screen.
          Authentication will be introduced in a later lab.
        </p>

        {state === "loading" && (
          <div className="selection-status" data-testid="loading-state">
            <Spinner />
            <span>Loading requesters…</span>
          </div>
        )}

        {state === "empty" && (
          <div className="selection-status selection-empty" data-testid="empty-state">
            No active requesters available. Please seed the database.
          </div>
        )}

        {state === "error" && (
          <div className="selection-status selection-error" data-testid="error-state">
            <p>Failed to load requesters. Please try again.</p>
            <Button variant="secondary" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        )}

        {state === "idle" && (
          <>
            <SelectField
              id="requester-select"
              label="Select Requester"
              required
              placeholder="— Choose a requester —"
              data-testid="requester-select"
              value={selectedId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedId(val ? Number(val) : null);
              }}
              options={requesters.map((r) => ({
                value: r.id,
                label: `${r.name} (${r.email})`,
              }))}
            />

            <Button
              disabled={selectedId === null}
              onClick={handleContinue}
              data-testid="continue-button"
            >
              Continue
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
