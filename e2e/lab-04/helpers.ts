// Lab 4 E2E helpers (Issue 29). Re-exports the Lab 3 helpers WITHOUT editing
// them (REG-01: no Lab 1-3 spec is changed to accommodate Lab 4) and adds what
// is Lab 4 specific: its own screenshot root, a console-error collector
// (E2E-06) and a throwaway-ticket factory.
import { expect, request as pwRequest, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  API_BASE,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  STAFF_EMAIL,
  STAFF_PASSWORD,
  createUserViaAdminApi,
  loginViaUi,
  capture as captureLab3,
  type CaptureOptions,
} from "../lab-03/helpers.js";

import { SEED_USERS } from "../../server/src/lib/seedData.js";

export * from "../lab-03/helpers.js";

/** Committed screenshot tree for Lab 4 (ui-spec.md section 9). */
export const SHOT_ROOT_LAB4 = "artifacts/lab-04/screenshots";

/**
 * Same behaviour as the Lab 3 `capture()` (scroll to top, fonts ready, settle
 * the sticky navbar) but writes under `artifacts/lab-04/screenshots/`. Lab 3's
 * helper hard-codes its own root, so the file is saved by delegating with a
 * relative path that climbs out of the Lab 3 root.
 */
export async function capture(
  page: Page,
  screen: string,
  project: string,
  options: CaptureOptions = {}
) {
  await captureLab3(page, `../../lab-04/screenshots/${screen}`, project, options);
}

/**
 * E2E-06 (FR-22): fail the test if the page logs a console error or throws an
 * unhandled exception. Call once per test (or in beforeEach) and call
 * `assertClean()` at the end. Expected failures a test provokes on purpose
 * (a 409 conflict, a stubbed 500) are filtered with `ignore`.
 */
export function collectConsoleErrors(page: Page, ignore: RegExp[] = []) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // The app asks GET /api/auth/me on every load; before login the answer is a
    // deliberate 401 the AuthContext handles (it shows the login page). Chrome
    // logs any non-2xx fetch as a console error, so that one probe is not a
    // defect. Anything else on that URL still fails.
    if (msg.location().url.endsWith("/api/auth/me") && /status of 401/.test(text)) return;
    if (ignore.some((re) => re.test(text))) return;
    errors.push(`console.error: ${text} @ ${msg.location().url}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return {
    errors,
    assertClean() {
      expect(errors, "unhandled console errors during the journey").toEqual([]);
    },
  };
}

/**
 * A cookie-jar-free API client. The shared `request` fixture keeps one jar per
 * test, and a jar cookie from an earlier login beats an explicit `Cookie`
 * header (Lab 3 helpers note the same 401), so every identity gets its own.
 */
export async function newApi() {
  return pwRequest.newContext();
}

/** Log the staff seed account in over the API and return its Cookie header. */
export async function staffSessionCookie(_request?: APIRequestContext) {
  const request = await newApi();
  const res = await request.post(`${API_BASE}/api/auth/login`, {
    data: { email: STAFF_EMAIL, password: STAFF_PASSWORD },
  });
  expect(res.status(), `staff login: ${res.status()}`).toBe(200);
  const cookie = (res.headers()["set-cookie"] ?? "").split(";")[0];
  await request.dispose();
  return cookie;
}

/** Skip on tablet/mobile for specs that only run on desktop (E2E-01..05). */
export function desktopOnly() {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "functional spec: desktop only");
  });
}

// ── Throw-away fixtures (Issue 29) ─────────────────────────────────────────
// Lab 4 specs WRITE only to tickets created here. `Ticket.version` rises on
// every status change and the seed never resets it, so seed tickets stay
// read-only. `summary` starts "E2E lab4", which `cleanup-e2e.ts` deletes.

/** Display name of the seed IT Staff account the specs log in as. */
export const STAFF_NAME = SEED_USERS.find((u) => u.email === STAFF_EMAIL)!.name;

export const E2E_PREFIX = "E2E lab4";
const REQUESTER_REAL_PASSWORD = "E2ELab4Req1!";

export interface TempTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  requesterEmail: string;
  requesterPassword: string;
  requesterCookie: string;
}

async function jsonOf<T>(res: { status(): number; json(): Promise<unknown>; text(): Promise<string> }, expected: number, what: string) {
  expect(res.status(), `${what}: ${res.status()} ${await res.text()}`).toBe(expected);
  return (await res.json()) as T;
}

/**
 * Create a Requester (through the real Admin API), complete its mandatory
 * first-login password change over the API, and file one Ticket as that
 * Requester. Status starts NEW; `statuses` then walks it forward as staff.
 */
export async function createTempTicket(
  _request: APIRequestContext | undefined,
  label: string,
  staffCookie: string,
  statuses: string[] = []
): Promise<TempTicket> {
  const request = await newApi();
  const adminApi = await newApi();
  const user = await createUserViaAdminApi(adminApi, ADMIN_EMAIL, ADMIN_PASSWORD, "REQUESTER");
  await adminApi.dispose();
  const login = await request.post(`${API_BASE}/api/auth/login`, {
    data: { email: user.email, password: user.password },
  });
  expect(login.status(), "temp requester login").toBe(200);
  const change = await request.post(`${API_BASE}/api/auth/change-password`, {
    data: {
      currentPassword: user.password,
      newPassword: REQUESTER_REAL_PASSWORD,
      confirmPassword: REQUESTER_REAL_PASSWORD,
    },
  });
  expect(change.status(), `change-password: ${await change.text()}`).toBe(200);
  const relogin = await request.post(`${API_BASE}/api/auth/login`, {
    data: { email: user.email, password: REQUESTER_REAL_PASSWORD },
  });
  expect(relogin.status(), "temp requester re-login").toBe(200);
  const requesterCookie = (relogin.headers()["set-cookie"] ?? "").split(";")[0];

  const cats = await jsonOf<{ data: { id: number }[] }>(await request.get(`${API_BASE}/api/categories`), 200, "categories");
  const systems = await jsonOf<{ data: { id: number }[] }>(await request.get(`${API_BASE}/api/related-systems`), 200, "related systems");
  const summary = `${E2E_PREFIX} ${label} ${Date.now()}`;
  const created = await jsonOf<{ data: { id: number; ticketNumber: string } }>(
    // No explicit header: this context's jar holds the freshly issued session.
    await request.post(`${API_BASE}/api/tickets`, {
      data: {
        summary,
        description: `${E2E_PREFIX} throw-away ticket for ${label}.`,
        requestedPriority: "MEDIUM",
        categoryId: cats.data[0].id,
        relatedSystemId: systems.data[0].id,
      },
    }),
    201,
    "create ticket"
  );
  const id = created.data.id;

  await request.dispose();

  if (statuses.length > 0) {
    // Fresh context: the requester's jar cookie must not shadow the staff header.
    const staffApi = await newApi();
    const claim = await staffApi.put(`${API_BASE}/api/staff/tickets/${id}/claim`, { headers: { cookie: staffCookie } });
    expect(claim.status(), `claim: ${await claim.text()}`).toBe(200);
    for (const next of statuses) {
      const res = await staffApi.put(`${API_BASE}/api/staff/tickets/${id}/status`, {
        headers: { cookie: staffCookie },
        data: { currentStatus: next },
      });
      expect(res.status(), `-> ${next}: ${await res.text()}`).toBe(200);
    }
    await staffApi.dispose();
  }
  return {
    id,
    ticketNumber: created.data.ticketNumber,
    summary,
    requesterEmail: user.email,
    requesterPassword: REQUESTER_REAL_PASSWORD,
    requesterCookie,
  };
}
/** Record an Action Taken through the real API (used to arrange a state). */
export async function recordActionViaApi(
  request: APIRequestContext,
  staffCookie: string,
  ticketId: number,
  description: string
) {
  const res = await request.post(`${API_BASE}/api/tickets/${ticketId}/actions`, {
    headers: { cookie: staffCookie },
    data: { description, result: `${description} result` },
  });
  return (await jsonOf<{ data: { id: number; version: number } }>(res, 201, "record action")).data;
}

/**
 * Click `trigger` and return `meta.total` from the list request the target page
 * fires — the same number the page itself renders. Never hard-coded.
 */
export async function clickAndReadListTotal(
  page: Page,
  trigger: ReturnType<Page["locator"]>,
  apiPath: "/api/staff/tickets" | "/api/tickets"
): Promise<number> {
  const responded = page.waitForResponse((r) => {
    const u = new URL(r.url());
    return u.pathname === apiPath && r.request().method() === "GET";
  });
  await trigger.click();
  const res = await responded;
  expect(res.status()).toBe(200);
  return ((await res.json()) as { meta: { total: number } }).meta.total;
}

// ── Seed facts for read-only screens (Issue 29, RESP/STATE) ────────────────
// Looked up from the seed definition at run time, never named by id.
import { SEED_ACTIONS_TAKEN, SEED_LAB4_TICKET_NUMBERS } from "../../server/src/lib/seedData.js";

/** Seed ticket number carrying the most Actions Taken (ties: lowest number). */
export function seedTicketWithMostActions(): { ticketNumber: string; actions: typeof SEED_ACTIONS_TAKEN } {
  const by = new Map<string, typeof SEED_ACTIONS_TAKEN>();
  for (const a of SEED_ACTIONS_TAKEN) by.set(a.ticketNumber, [...(by.get(a.ticketNumber) ?? []), a]);
  const [ticketNumber, actions] = [...by.entries()].sort((x, y) => y[1].length - x[1].length || x[0].localeCompare(y[0]))[0];
  return { ticketNumber, actions };
}

/** A Lab 4 seed ticket that carries no Action Taken (MIG-05 guarantees one). */
export function seedTicketWithoutActions(): string {
  const withActions = new Set(SEED_ACTIONS_TAKEN.map((a) => a.ticketNumber));
  const n = SEED_LAB4_TICKET_NUMBERS.find((t) => !withActions.has(t));
  if (!n) throw new Error("seedData has no Lab 4 ticket without actions");
  return n;
}

/** Resolve a ticket number to its id through the real staff list API. */
export async function ticketIdByNumber(staffCookie: string, ticketNumber: string): Promise<number> {
  const api = await newApi();
  const res = await api.get(`${API_BASE}/api/staff/tickets?search=${encodeURIComponent(ticketNumber)}`, {
    headers: { cookie: staffCookie },
  });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { data: { id: number; ticketNumber: string }[] };
  await api.dispose();
  const hit = body.data.find((t) => t.ticketNumber === ticketNumber);
  expect(hit, `seed ticket ${ticketNumber} must exist`).toBeTruthy();
  return hit!.id;
}

/** Log the page in as the seed IT Staff account and wait for the dashboard. */
export async function staffLogin(page: Page) {
  await loginViaUi(page, STAFF_EMAIL, STAFF_PASSWORD);
  await expect(page).toHaveURL(/\/staff\/dashboard/);
}
