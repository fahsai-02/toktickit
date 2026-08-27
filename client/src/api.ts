const API_URL = import.meta.env.VITE_API_URL ?? "";

// ── Types ──────────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
}

export interface Requester {
  id: number;
  name: string;
  email: string;
  department: string | null;
}

export interface RelatedSystem {
  id: number;
  name: string;
  categoryId: number | null;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

// ── Legacy (Lab 1) ────────────────────────────────────────────────────────

export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error(`Health check failed with status ${healthRes.status}`);
  }

  const categoriesRes = await fetch(`${API_URL}/api/categories`);
  if (!categoriesRes.ok) {
    throw new Error(
      `Category fetch failed with status ${categoriesRes.status}`
    );
  }

  const { data: categories } = (await categoriesRes.json()) as {
    data: Category[];
  };
  return { online: true, categories };
}

// ── Lab 2 Reference APIs ───────────────────────────────────────────────────

export async function fetchRequesters(): Promise<Requester[]> {
  const res = await fetch(`${API_URL}/api/dev/requesters`);
  if (!res.ok) {
    throw new Error(`Failed to fetch requesters: ${res.status}`);
  }
  const { data } = (await res.json()) as { data: Requester[] };
  return data;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) {
    throw new Error(`Failed to fetch categories: ${res.status}`);
  }
  const { data } = (await res.json()) as { data: Category[] };
  return data;
}

export async function fetchRelatedSystems(
  categoryId?: number
): Promise<RelatedSystem[]> {
  const url = new URL(`${API_URL}/api/related-systems`);
  if (categoryId !== undefined) {
    url.searchParams.set("categoryId", String(categoryId));
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch related systems: ${res.status}`);
  }
  const { data } = (await res.json()) as { data: RelatedSystem[] };
  return data;
}
