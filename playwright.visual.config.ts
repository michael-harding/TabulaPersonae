import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "tests/visual",
  snapshotDir: "tests/visual/__snapshots__",
  updateSnapshots: "missing",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5175",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          // Required on some Arch Linux setups when running without a sandbox
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
      },
    },
    {
      // Full pages, the modal shell and the overlays only (TESTING.md "Visual Regression Coverage"):
      // enough to catch an engine difference in page layout or in the shared overlays, without a
      // second copy of every baseline to review.
      name: "firefox",
      testMatch: ["pages.spec.ts", "themes.spec.ts", "public-share.spec.ts", "modal-shell.spec.ts", "overlays.spec.ts"],
      use: { ...devices["Desktop Firefox"] },
    },
  ],
  webServer: {
    // Its own mode and port: the visual mode pins the footer's version (vite.config.ts), and a
    // separate port means an ordinary `pnpm dev` server, showing the real version, is never reused.
    command: "pnpm dev:visual",
    url: "http://localhost:5175",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
