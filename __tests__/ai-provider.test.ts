import { afterEach, describe, expect, it, vi } from "vitest";
import { callAiProvider } from "../convex/aiProvider";

const completion = (content: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
const failure = (status: number, message: string) =>
  new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("managed AI provider routing", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("fails over from a rate-limited primary provider to a healthy configured provider", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-groq-key");
    vi.stubEnv("CEREBRAS_API_KEY", "test-cerebras-key");
    vi.stubEnv("MISTRAL_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("HUGGINGFACE_API_KEY", "");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "");
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(failure(429, "rate limited"))
      .mockResolvedValueOnce(completion("fallback succeeded"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiProvider("planner", "bounded test prompt", 200)).resolves.toBe("fallback succeeded");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain("api.groq.com");
    expect(fetchMock.mock.calls[1][0]).toContain("api.cerebras.ai");
  });

  it("skips Cloudflare failover when the account ID is missing", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-groq-key");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "test-cloudflare-token");
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "");
    vi.stubEnv("CEREBRAS_API_KEY", "test-cerebras-key");
    vi.stubEnv("MISTRAL_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(failure(429, "rate limited"))
      .mockResolvedValueOnce(completion("cerebras fallback succeeded"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiProvider("planner", "bounded test prompt", 200)).resolves.toBe("cerebras fallback succeeded");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain("api.groq.com");
    expect(fetchMock.mock.calls[1][0]).toContain("api.cerebras.ai");
  });

  it("calls Cloudflare Workers AI with its account-scoped endpoint and free-tier model", async () => {
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "test-cloudflare-token");
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "test-account-id");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("CEREBRAS_API_KEY", "");
    vi.stubEnv("MISTRAL_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const fetchMock = vi.fn().mockResolvedValueOnce(completion("cloudflare succeeded"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiProvider("planner", "bounded test prompt", 200)).resolves.toBe("cloudflare succeeded");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/accounts/test-account-id/ai/v1/chat/completions");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe("@cf/meta/llama-3.1-8b-instruct-fp8-fast");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer test-cloudflare-token");
  });

  it("does not use the deprioritized OpenRouter endpoint for automatic failover", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("CEREBRAS_API_KEY", "");
    vi.stubEnv("MISTRAL_API_KEY", "");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "");
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "");
    vi.stubEnv("OPENROUTER_API_KEY", "test-openrouter-key");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiProvider("planner", "bounded test prompt", 200)).rejects.toThrow(/No AI providers configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not use deferred Hugging Face or OpenRouter during automatic routing", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("CEREBRAS_API_KEY", "");
    vi.stubEnv("MISTRAL_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "test-openrouter-key");
    vi.stubEnv("HUGGINGFACE_API_KEY", "test-huggingface-token");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "");
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiProvider("planner", "bounded test prompt", 200)).rejects.toThrow(/No AI providers configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("captures provider-reported token usage and cost without estimating missing charges", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-groq-key");
    vi.stubEnv("CEREBRAS_API_KEY", "");
    vi.stubEnv("MISTRAL_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("HUGGINGFACE_API_KEY", "");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "");
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "");
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      choices: [{ message: { content: "measured response" } }],
      usage: { prompt_tokens: 31, completion_tokens: 17, total_tokens: 48, cost: 0.00042 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const recordUsage = vi.fn().mockResolvedValue(undefined);

    await expect(callAiProvider("planner", "bounded test prompt", 200, recordUsage)).resolves.toBe("measured response");
    expect(recordUsage).toHaveBeenCalledWith(expect.objectContaining({
      provider: "groq",
      model: "openai/gpt-oss-20b",
      promptTokens: 31,
      completionTokens: 17,
      totalTokens: 48,
      reportedCostUsd: 0.00042,
    }));
  });

  it("reports provider failures without leaking configured key values", async () => {
    vi.stubEnv("GROQ_API_KEY", "do-not-print-groq-secret");
    vi.stubEnv("CEREBRAS_API_KEY", "do-not-print-cerebras-secret");
    vi.stubEnv("MISTRAL_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("HUGGINGFACE_API_KEY", "");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "");
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(failure(401, "unauthorized"))
      .mockResolvedValueOnce(failure(429, "quota exhausted")));

    let message = "";
    try {
      await callAiProvider("planner", "bounded test prompt", 100);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toMatch(/All configured AI providers failed/);
    expect(message).not.toContain("do-not-print-groq-secret");
    expect(message).not.toContain("do-not-print-cerebras-secret");
  });
});
