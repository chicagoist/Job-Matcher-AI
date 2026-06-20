import { describe, expect, it, vi, afterEach } from "vitest";
import { callOllama } from "../../src/background/lib/ollama-client.js";
import { OllamaConnectionError, OllamaServerError } from "../../src/background/lib/errors.js";

const originalFetch = globalThis.fetch;

function mockResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const baseArgs = {
  host: "http://localhost:11434",
  model: "llama3.2:3b",
  systemPrompt: "system prompt",
  userContent: "user content",
};

describe("callOllama", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns text on success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse(200, { message: { content: '{"score": 8}' }, model: "llama3.2:3b" }),
    );
    const r = await callOllama(baseArgs);
    expect(r.text).toBe('{"score": 8}');
    expect(r.model).toBe("llama3.2:3b");
  });

  it("uses host from args", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      mockResponse(200, { message: { content: "ok" }, model: "m" }),
    );
    globalThis.fetch = fetchSpy;
    await callOllama({ ...baseArgs, host: "http://192.168.1.100:11434" });
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://192.168.1.100:11434/api/chat",
      expect.any(Object),
    );
  });

  it("throws OllamaConnectionError on fetch failure (TypeError)", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(callOllama(baseArgs)).rejects.toBeInstanceOf(OllamaConnectionError);
  });

  it("throws OllamaServerError on HTTP 500", async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve(mockResponse(500, { error: "internal error" })),
    );
    await expect(callOllama(baseArgs)).rejects.toBeInstanceOf(OllamaServerError);
  });

  it("retries on HTTP 500 and succeeds on second attempt", async () => {
    let callCount = 0;
    const fetchSpy = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve(mockResponse(500, { error: "oops" }));
      return Promise.resolve(mockResponse(200, { message: { content: "ok" }, model: "m" }));
    });
    globalThis.fetch = fetchSpy;
    const r = await callOllama(baseArgs);
    expect(r.text).toBe("ok");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("throws OllamaServerError on empty response", async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve(mockResponse(200, { message: { content: "" } })),
    );
    await expect(callOllama(baseArgs)).rejects.toBeInstanceOf(OllamaServerError);
  });

  it("throws OllamaServerError on missing message field", async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve(mockResponse(200, {})),
    );
    await expect(callOllama(baseArgs)).rejects.toBeInstanceOf(OllamaServerError);
  });

  it("strips trailing slash from host", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      mockResponse(200, { message: { content: "ok" }, model: "m" }),
    );
    globalThis.fetch = fetchSpy;
    await callOllama({ ...baseArgs, host: "http://localhost:11434/" });
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:11434/api/chat",
      expect.any(Object),
    );
  });
});
