/**
 * Unit smoke test — verifies the vitest setup is working.
 * No Firebase or external calls.
 */
import { describe, it, expect } from "vitest";

describe("unit test smoke", () => {
  it("runs without a Firebase connection", () => {
    expect(1 + 1).toBe(2);
  });

  it("environment is node (no DOM)", () => {
    // In a node environment, `window` should be undefined
    expect(typeof window).toBe("undefined");
  });
});
