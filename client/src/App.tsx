import { useState } from "react";
import { checkSystem, Category } from "./api.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);

  async function handleCheck() {
    setState("loading");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "loading" && (
        <div className="d-flex align-items-center gap-2 mt-3 text-muted">
          <span
            className="spinner-border spinner-border-sm"
            role="status"
            aria-hidden="true"
          />
          Checking system…
        </div>
      )}

      {state === "success" && (
        <div className="mt-4">
          <p className="mb-3 text-success">System Status: Online</p>
          <h2 className="h5">Supported Request Categories</h2>
          <ol className="list-group list-group-numbered">
            {categories.map((category) => (
              <li key={category.id} className="list-group-item">
                {category.name}
              </li>
            ))}
          </ol>
        </div>
      )}

      {state === "error" && (
        <div className="mt-4">
          <p className="mb-1 text-danger">System Status: Offline</p>
          <p className="mb-0 text-danger">Unable to connect to TokTickIT API</p>
        </div>
      )}
    </div>
  );
}
