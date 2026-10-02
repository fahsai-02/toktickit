import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // The Lab 3 specs share ONE dev database: they re-seed it, rotate seed
  // passwords (BR-02) and delete E2E rows. Two browsers at once — or two tests
  // inside one file at once — would race each other, so serial execution is a
  // requirement, not a preference. Set here as well as in the npm scripts so a
  // bare `npx playwright test` (or the VS Code extension) cannot start racing.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  outputDir: "artifacts/test-results",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: { width: 1440, height: 900 },
      },
    },
    // Tablet stays at 820px: `client/src/App.css` switches to the mobile
    // layout at `max-width: 768px`, so a 768px-wide run would render the
    // mobile layout instead of the tablet one. 820px sits inside the tablet
    // band (769-991px) defined in `ui-spec.md` section 6.
    {
      name: "tablet",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: { width: 820, height: 1180 },
      },
    },
    // Mobile is 375px to match the Issue 23 acceptance criteria verbatim
    // ("1440px desktop, 768px tablet, or 375px mobile"). 375 is the narrowest
    // supported layout, so it is where clipping, overlap and horizontal
    // scrolling surface first — a wider capture would hide all three.
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: { width: 375, height: 844 },
      },
    },
  ],
});
