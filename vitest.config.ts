import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Unit tests — no emulator, no DOM needed for pure logic
    environment: "node",
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}", "lib/**/*.{test,spec}.{ts,tsx}"],
    globals: true,
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
