import { clearEmulators, waitForEmulators } from "./emulator"

// Runs after the web servers have started (see playwright.config.ts). Tests never clear the
// emulators themselves — they run in parallel against the same one — so this is the only place
// data from an earlier run is removed.
export default async function globalSetup(): Promise<void> {
  // Playwright waits for Firestore only; Auth can still be starting
  await waitForEmulators()
  await clearEmulators()
}
