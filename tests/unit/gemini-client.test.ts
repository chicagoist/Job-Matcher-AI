import { describe, expect, it, vi, afterEach } from "vitest";
import { callGemini } from "../../src/background/lib/gemini-client.js";
import {
  GeminiAuthError,
  GeminiRateLimitError,
  GeminiBadRequestError,
  GeminiServerError,
} from "../../src/background/lib/errors.js";

const originalFetch = globalThis.fetch;

function mockResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const baseArgs = {
  apiKey: "k",
  model: "m",
  systemInstruction: "x",
  userParts: [{ text: "y" }],
};

describe("callGemini", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns text on success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse(200, { candidates: [{ content: { parts: [{ text: "ok" }] } }] }),
    );
    const r = await callGemini(baseArgs);
    expect(r.text).toBe("ok");
    expect(r.model).toBe("m");
  });

  it("throws GeminiAuthError on 401", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse(401, { error: { message: "bad key" } }));
    await expect(callGemini(baseArgs)).rejects.toBeInstanceOf(GeminiAuthError);
  });

  it("throws GeminiBadRequestError on 400 without retrying", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(mockResponse(400, { error: { message: "bad" } }));
    globalThis.fetch = fetchSpy;
    await expect(callGemini(baseArgs)).rejects.toBeInstanceOf(GeminiBadRequestError);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("retries on 500 and finally throws GeminiServerError", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(mockResponse(500, { error: { message: "oops1" } }))
      .mockResolvedValueOnce(mockResponse(500, { error: { message: "oops2" } }))
      .mockResolvedValueOnce(mockResponse(500, { error: { message: "oops3" } }));
    globalThis.fetch = fetchSpy;
    await expect(callGemini(baseArgs)).rejects.toBeInstanceOf(GeminiServerError);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});

void GeminiRateLimitError;
