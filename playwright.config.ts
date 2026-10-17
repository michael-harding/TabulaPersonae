import { defineConfig, devices } from "@playwright/test"

// Required on some Arch Linux setups when running without a sandbox
const launchOptions = { args: ["--no-sandbox", "--disable-setuid-sandbox"] }

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  // Clears the emulators once per run; each test then works under its own user (see emulator.ts).
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    // Its own port, so a plain `pnpm dev` (which talks to real Firebase) is never reused for e2e.
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], launchOptions },
    },
    {
      name: "chromium-dark",
      // Timings are taken once, in the chromium project.
      grepInvert: /@perf/,
      use: { ...devices["Desktop Chrome"], colorScheme: "dark", launchOptions },
    },
    {
      name: "mobile",
      // The core flows, tagged @mobile, on a phone-sized touch screen.
      grep: /@mobile/,
      use: { ...devices["Pixel 7"], launchOptions },
    },
  ],
  webServer: [
    {
      // Firebase Local Emulator Suite (Auth + Firestore) under a demo- project: nothing reaches Google.
      command: "pnpm emulators",
      url: "http://127.0.0.1:8080/",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // The dev server pointed at the emulators (see package.json and src/lib/firebase.ts).
      command: "pnpm dev:e2e",
      url: "http://localhost:5174",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
