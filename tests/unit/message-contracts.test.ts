import { describe, expect, it } from "vitest";
import { isAppMessage } from "../../src/shared/message-contracts.js";

describe("isAppMessage", () => {
  it("accepts known actions", () => {
    expect(isAppMessage({ action: "TOGGLE_PANEL" })).toBe(true);
    expect(isAppMessage({ action: "ANALYZE_JOB" })).toBe(true);
    expect(isAppMessage({ action: "AUDIO_SOLVE" })).toBe(true);
  });
  it("rejects unknown actions", () => {
    expect(isAppMessage({ action: "WHATEVER" })).toBe(false);
    expect(isAppMessage({})).toBe(false);
    expect(isAppMessage(null)).toBe(false);
    expect(isAppMessage("ANALYZE_JOB")).toBe(false);
  });
});
