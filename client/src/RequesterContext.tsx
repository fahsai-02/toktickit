import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Requester } from "./api.js";

const STORAGE_KEY = "toktickit-requester";

function loadStoredRequester(): Requester | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Requester;
  } catch {
    return null;
  }
}

function saveStoredRequester(requester: Requester | null): void {
  if (requester) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requester));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

interface RequesterContextValue {
  requester: Requester | null;
  selectRequester: (requester: Requester) => void;
  clearRequester: () => void;
}

const RequesterContext = createContext<RequesterContextValue | null>(null);

export function RequesterProvider({ children }: { children: ReactNode }) {
  const [requester, setRequester] = useState<Requester | null>(
    loadStoredRequester
  );

  const selectRequester = useCallback((r: Requester) => {
    setRequester(r);
    saveStoredRequester(r);
  }, []);

  const clearRequester = useCallback(() => {
    setRequester(null);
    saveStoredRequester(null);
  }, []);

  return (
    <RequesterContext.Provider
      value={{ requester, selectRequester, clearRequester }}
    >
      {children}
    </RequesterContext.Provider>
  );
}

export function useRequester(): RequesterContextValue {
  const ctx = useContext(RequesterContext);
  if (!ctx) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return ctx;
}
