const API_URL = import.meta.env.VITE_API_URL ?? "";

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

// Issue 2 — call the backend. Throwing on failure lets the UI show an
// Offline/error state. (Categories are filled in during Issue 4.)
export async function checkSystem(): Promise<SystemStatus> {
  const res = await fetch(`${API_URL}/api/health`);
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return { online: true, categories: [] };
}
