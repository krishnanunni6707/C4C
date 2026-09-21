import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest config for emulator-backed integration tests.
 * Usage: npm run test:emu
 * Assumes FIRESTORE_EMULATOR_HOST is set by `firebase emulators:exec`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/emu/**/*.test.ts"],
    globals: true,
    // Run emulator tests serially to avoid contention on shared collections
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    alias: {
      "@": path.resolve(__dirname, "."),
    },
    // Longer timeout for Firestore round-trips
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
