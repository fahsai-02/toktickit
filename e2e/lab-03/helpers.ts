import { expect, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SEED_USERS } from "../../server/src/lib/seedData.js";

const serverDir = fileURLToPath(new URL("../../server/", import.meta.url));

/**
 * Return the shared dev DB to the documented seed state: drop E2E residue
 * first (the seed only upserts known rows, so e2e-created users, Public
 * Comments and Internal Notes would otherwise accumulate and break the
 * exact-count server suites such as API-68), then re-seed — which also
 * restores any seed password an earlier E2E run rotated, keeping the MIG-01
 * credential checks green.
 */
export function resetLab3Db() {
  execFileSync("pnpm", ["exec", "tsx", "prisma/cleanup-e2e.ts"], {
    cwd: serverDir,
    stdio: "pipe",
    timeout: 120_000,
  });
  execFileSync("pnpm", ["exec", "prisma", "db", "seed"], {
    cwd: serverDir,
    stdio: "pipe",
    timeout: 120_000,
  });
}

/**
 * Register the shared-DB lifecycle for a spec file: re-seed before it runs and
 * restore the documented seed state after it, including when a test FAILS.
 *
 * Hooks, not an in-test tail: a failed assertion aborts the test body, so an
 * in-test cleanup would never run and would leave rotated seed passwords and
 * `e2e.*` rows behind for the next run.
 *
 * Desktop project only. The functional lab-03 specs `test.skip` themselves on
 * the tablet/mobile projects, and re-seeding for a test that never executes is
 * pure cost — each hook hashes 11 accounts with bcrypt at cost 12.
 *
 * Pass `{ allProjects: true }` for the visual specs (Issue 23, RESP-01..30),
 * which DO execute on all three viewport projects. They need it: every seeded
 * Requester holds an initial password (BR-02), so reaching any requester screen
 * means completing a mandatory first-login change, which rewrites that account's
 * password. Re-seeding per project restores the documented password before each
 * viewport run, so the same seed account can be reused on desktop, tablet, and
 * mobile without the second viewport failing to log in.
 */
export function useLab3DbHooks(options: { allProjects?: boolean } = {}) {
  // Typed off `test.beforeAll` itself so the signature (and Playwright's
  // "first argument must destructure" rule) stays in sync with the installed
  // version. `beforeAll` is overloaded — (hookFn) and (title, hookFn) — so the
  // hook parameter is index 1. `TestInfo` is the hook's second argument.
  type DbHook = Parameters<typeof test.beforeAll>[1];
  const hook: DbHook = ({}, testInfo: TestInfo) => {
    if (!options.allProjects && testInfo.project.name !== "desktop") return;
    // A hook gets the PROJECT timeout (60s in playwright.config.ts), not the
    // test's own `test.setTimeout`, so the seed needs a bigger budget here.
    test.setTimeout(180_000);
    resetLab3Db();
  };
  test.beforeAll(hook);
  test.afterAll(hook);
}

/**
 * Unique address for a record the test creates. The `e2e.` prefix is
 * load-bearing: `server/prisma/cleanup-e2e.ts` deletes every user whose email
 * starts with it, so a differently-prefixed throwaway account would survive
 * `resetLab3Db()` and poison the shared dev DB.
 */
export function e2eEmail(label: string) {
  return `e2e.${label}.${Date.now()}@toktickit.dev`;
}

/**
 * Look a seeded account up by email and fail loudly when the seed no longer
 * contains it. The specs deliberately address specific accounts (not "the
 * first requester") so two specs never rotate the same mandatory-change
 * password (BR-02); this guard turns seed drift into a readable error instead
 * of a confusing login timeout.
 */
function seedUser(email: string) {
  const user = SEED_USERS.find((u) => u.email === email);
  if (!user) {
    throw new Error(
      `Seed account "${email}" is missing from server/src/lib/seedData.ts — ` +
        `update e2e/lab-03/helpers.ts to match the seed.`
    );
  }
  return user;
}

// ── Seed accounts ────────────────────────────────────────────────────────
// Addresses stay literal (the specs must target a SPECIFIC account so two
// specs never rotate the same mandatory-change password, BR-02), but each one
// is validated against server/src/lib/seedData.ts and its password is read
// from that same row. seedData.ts itself imports the passwords from
// server/src/lib/seedCredentials.ts — the same modules prisma/seed.ts uses —
// so a credential change is picked up here automatically and this file can
// never disagree with the seed.

// David Lee — seeded Requester with mustChangePassword=true. E2E-05 rotates
// his password, so only that spec may use him.
export const REQ_EMAIL = "david.lee@toktickit.dev";
export const REQ_INITIAL_PASSWORD = seedUser(REQ_EMAIL).password;

// Sarah Johnson — the second seeded Requester with mustChangePassword=true.
// E2E-01/02 use her so the login spec never races E2E-05 over david.lee's
// password rotation.
export const SARAH_EMAIL = "sarah.johnson@toktickit.dev";
export const SARAH_INITIAL_PASSWORD = seedUser(SARAH_EMAIL).password;
export const SARAH_NEW_PASSWORD = "E2ESarah1!";

// Passwords an E2E run sets after the mandatory first-login change (BR-02).
// `resetLab3Db()` restores the documented initial password afterwards.
export const REQ_PASSWORD = "E2ERequester1!";

// Seed IT Staff (mustChangePassword=false, real password) — E2E-03.
export const STAFF_EMAIL = "itstaff.sara@toktickit.dev";
export const STAFF_PASSWORD = seedUser(STAFF_EMAIL).password;

// Seed Administrator (mustChangePassword=false, real password) — E2E-04.
export const ADMIN_EMAIL = "admin@toktickit.dev";
export const ADMIN_PASSWORD = seedUser(ADMIN_EMAIL).password;

// The seeded INACTIVE Requester, resolved from the seed definition instead of
// hard-coding an address (E2E-02 / AC-06). Any non-matching credential must
// produce the same generic 401 message as an unknown email (BR-01).
export const INACTIVE_EMAIL = (() => {
  const inactive = SEED_USERS.find((u) => !u.isActive && u.role === "REQUESTER");
  if (!inactive) {
    throw new Error(
      "No inactive REQUESTER in server/src/lib/seedData.ts — E2E-02 needs one."
    );
  }
  return inactive.email;
})();

// Initial password handed to accounts the specs create through the Admin UI.
// This is NOT seed data — it is a throwaway credential for the account this
// run creates, and it only has to satisfy the server's strength rules.
export const NEW_USER_INITIAL_PASSWORD = "TempE2e123!";

// ── UI flows shared by more than one spec ────────────────────────────────

export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.click('[data-testid="login-submit"]');
}

/** Log out from the profile menu (Navbar) and wait for the /login redirect. */
export async function logoutViaUi(page: Page) {
  await page.click('button[aria-haspopup="menu"]');
  await page.click('button:has-text("Logout")');
  await expect(page).toHaveURL(/\/login/);
}

export async function changePasswordViaUi(
  page: Page,
  currentPassword: string,
  newPassword: string
) {
  await page.fill("#change-current", currentPassword);
  await page.fill("#change-new", newPassword);
  await page.fill("#change-confirm", newPassword);
  await page.click('[data-testid="change-password-submit"]');
  await expect(page).not.toHaveURL(/\/change-password/);
}

/** Base URL of the API — the Vite dev server proxies `/api` to it. */
export const API_BASE = "http://localhost:5000";

// ── Screenshot + layout evidence (Issue 23, RESP-01..30) ──────────────────

/**
 * Root of the committed screenshot tree. Paths mirror `ui-spec.md` section 9
 * exactly, so a reviewer can diff a spec line against a file on disk.
 *
 * `.gitignore` carries a blanket `*.png` (it exists to keep stray images out of
 * commits), so these files need `git add -f` — the same treatment the Lab 2
 * screenshots under `artifacts/lab-02/screenshots/` already have.
 */
export const SHOT_ROOT = "artifacts/lab-03/screenshots";

/**
 * True for the projects whose width falls in the mobile layout band
 * (`client/src/App.css` `@media (max-width: 768px)`), which is what decides
 * whether a screen shows its desktop table or its mobile card list.
 *
 * Callers must ask this instead of comparing against the project name, so a
 * newly added viewport project cannot accidentally be asserted as a desktop
 * table on a screen that renders cards.
 */
export function isMobileProject(projectName: string) {
  return projectName === "mobile";
}

/**
 * Assert the page does not scroll sideways at the current viewport — the
 * headline acceptance criterion of Issue 23 ("no unintended horizontal
 * scrolling"). `scrollWidth` is the widest pixel column the document occupies;
 * when it exceeds the window width, something is sticking out and the user
 * would have to scroll a page that is supposed to fit.
 *
 * One pixel of slack is allowed: sub-pixel layout rounds `scrollWidth` up, and
 * a 1px overhang produces no scrollbar in any browser, so failing on it would
 * be a false alarm. The two real defects this caught were 2px (hamburger) and
 * 19px (profile button + role badge), both far outside that slack.
 */
export async function assertNoHorizontalScroll(page: Page) {
  const scrollWidth = await page.evaluate(
    () => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth)
  );
  const innerWidth = await page.evaluate(() => window.innerWidth);
  expect(
    scrollWidth,
    `document scrollWidth ${scrollWidth} exceeds innerWidth ${innerWidth}`
  ).toBeLessThanOrEqual(innerWidth + 1);
}

export interface CaptureOptions {
  /**
   * `true` (default) captures the whole scrollable page. Overlay shots — the
   * create/edit drawer, the deactivation dialog — pass `false`: those elements
   * are `position: fixed`, and a stitched full-page screenshot re-renders them
   * against the taller virtual viewport, which smears a single overlay across
   * the whole image.
   */
  fullPage?: boolean;
}

/**
 * Save a viewport screenshot to
 * `artifacts/lab-03/screenshots/<screen>/<project>.png`, where `<screen>` may
 * contain a slash (`states/login-error`) and `<project>` is the Playwright
 * project name (desktop / tablet / mobile).
 */
export async function capture(
  page: Page,
  screen: string,
  project: string,
  options: CaptureOptions = {}
) {
  const { fullPage = true } = options;
  // Scroll to the top first: Playwright stitches a full-page shot from the
  // current scroll offset, so a page left scrolled mid-list starts the image
  // halfway down and puts the sticky header below a blank band.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.fonts?.ready);
  // 600ms, not 150ms (the Lab 2 helper learned this the hard way): the sticky
  // navbar needs longer to re-stick after a scroll-to-top, otherwise the mobile
  // shots keep a white gap above the header.
  await page.waitForTimeout(600);
  await page.screenshot({
    path: `${SHOT_ROOT}/${screen}/${project}.png`,
    fullPage,
  });
}

/**
 * Log in and, when BR-02 forces it, complete the mandatory first-login change
 * so the app unlocks. Returns the password the session actually holds.
 *
 * Every seeded Requester holds an initial password, so any requester screen
 * below `/change-password` needs this. Accounts whose seed flag is already
 * `false` (IT Staff, Administrator) skip straight through.
 *
 * Pass `{ completeMandatoryChange: false }` to STOP on the change-password
 * screen instead of submitting it — that is what the RESP-04..06 screenshot
 * needs, and submitting there would both destroy the evidence and burn the
 * account's initial password for every later test in the run.
 */
export async function loginAndUnlock(
  page: Page,
  email: string,
  password: string,
  options: { completeMandatoryChange?: boolean } = {}
) {
  const { completeMandatoryChange = true } = options;
  await page.goto("/login");
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  // Wait for the POST /api/auth/login round-trip itself. Without this the
  // caller would read `page.url()` while the button is still in its busy
  // state, decide "no redirect happened", and go on to assert against a page
  // that has not been given the session cookie yet.
  const loginResponse = page.waitForResponse(
    (r) => r.url().includes("/api/auth/login") && r.request().method() === "POST"
  );
  await page.click('[data-testid="login-submit"]');
  await loginResponse;
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));

  if (new URL(page.url()).pathname !== "/change-password") return password;
  if (!completeMandatoryChange) return password;

  const newPassword = `Visual${Math.random().toString(36).slice(2, 10)}1!`;
  await changePasswordViaUi(page, password, newPassword);
  return newPassword;
}

/**
 * Log in over the Admin API and return the raw `Cookie` header value.
 *
 * The cookie is handed back to callers instead of relying on
 * `APIRequestContext`'s own cookie jar: one context is shared per test, and a
 * jar cookie left over from an earlier login does not reliably give way to an
 * explicit `Cookie` header, which surfaced as a puzzling 401 from
 * `GET /api/admin/users`.
 */
export async function adminSessionCookie(
  request: APIRequestContext,
  adminEmail: string,
  adminPassword: string
): Promise<string> {
  const login = await request.post(`${API_BASE}/api/auth/login`, {
    data: { email: adminEmail, password: adminPassword },
  });
  expect(login.status(), `admin login: ${login.status()} ${await login.text()}`).toBe(200);
  const cookie = login.headers()["set-cookie"] ?? "";
  expect(cookie, "admin login must set a session cookie").not.toBe("");
  return cookie.split(";")[0];
}

/**
 * Create an account through the real Admin API and return its credentials.
 * Used only where a state cannot be reached with seed data alone (a Requester
 * with zero tickets, a second Administrator for the self-deactivation guard).
 *
 * The `e2e.` email prefix is what `server/prisma/cleanup-e2e.ts` matches on, so
 * the throwaway never survives into the shared dev DB. The admin session cookie
 * comes back too, so a caller can keep using the same session instead of
 * logging in a second time.
 */
export async function createUserViaAdminApi(
  request: APIRequestContext,
  adminEmail: string,
  adminPassword: string,
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR"
): Promise<{ email: string; password: string; sessionCookie: string }> {
  const email = e2eEmail(role.toLowerCase());
  const password = NEW_USER_INITIAL_PASSWORD;
  const cookie = await adminSessionCookie(request, adminEmail, adminPassword);

  const res = await request.post(`${API_BASE}/api/admin/users`, {
    headers: { cookie },
    data: { name: `Visual ${role} ${Date.now()}`, email, role, initialPassword: password },
  });
  expect(res.status(), `admin create user: ${res.status()} ${await res.text()}`).toBe(201);
  return { email, password, sessionCookie: cookie };
}

/**
 * Flip a user's activation through the real Admin API, used to undo a
 * throwaway account from `createUserViaAdminApi` before a later test depends on
 * the Administrator count (Lab 3 has no user-deletion endpoint, so "deactivate"
 * is the only way back). Driven over the API rather than the drawer so the call
 * does not have to fight an overlay a failed assertion left open.
 */
export async function setUserActiveViaAdminApi(
  request: APIRequestContext,
  sessionCookie: string,
  targetEmail: string,
  isActive: boolean
) {
  const headers = { cookie: sessionCookie };
  const listed = await request.get(
    `${API_BASE}/api/admin/users?search=${encodeURIComponent(targetEmail)}`,
    { headers }
  );
  expect(listed.status(), `admin list: ${listed.status()} ${await listed.text()}`).toBe(200);
  const body = (await listed.json()) as { data?: { id: number; email: string }[] };
  const target = body.data?.find((u) => u.email === targetEmail);
  expect(target, `admin list must return ${targetEmail}`).toBeTruthy();

  const res = await request.put(`${API_BASE}/api/admin/users/${target!.id}`, {
    headers,
    data: { isActive },
  });
  expect(res.status(), `admin set isActive: ${res.status()} ${await res.text()}`).toBe(200);
}
