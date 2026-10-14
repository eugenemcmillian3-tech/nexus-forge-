type ProviderName = "cloudflare" | "groq" | "mistral" | "cerebras" | "openrouter" | "huggingface";
type ChatRole = "planner" | "wave1" | "wave2" | "critic" | "research";

const providers: Record<ProviderName, { url: string; key: string; model: string }> = {
  cloudflare: { url: "https://api.cloudflare.com/client/v4/accounts", key: "CLOUDFLARE_API_TOKEN", model: "@cf/meta/llama-3.1-8b-instruct-fp8-fast" },
  groq: { url: "https://api.groq.com/openai/v1", key: "GROQ_API_KEY", model: "openai/gpt-oss-20b" },
  mistral: { url: "https://api.mistral.ai/v1", key: "MISTRAL_API_KEY", model: "mistral-small-latest" },
  cerebras: { url: "https://api.cerebras.ai/v1", key: "CEREBRAS_API_KEY", model: "gpt-oss-120b" },
  // OpenRouter model-level fallbacks are best-effort; free endpoints may be rate-limited or unavailable.
  openrouter: { url: "https://openrouter.ai/api/v1", key: "OPENROUTER_API_KEY", model: "openai/gpt-oss-120b:free" },
  // Hugging Face Inference Providers has limited free-tier quota; availability and free credits vary by account.
  huggingface: { url: "https://router.huggingface.co/v1", key: "HUGGINGFACE_API_KEY", model: "Qwen/Qwen3-4B-Instruct-2507" },
};

const routes: Record<ChatRole, ProviderName> = {
  planner: "groq",
  wave1: "groq",
  wave2: "cerebras",
  critic: "cerebras",
  research: "groq",
};

// Keep automatic routing limited to the three providers selected for routine execution: Cloudflare, Groq, and Cerebras. Mistral is rate-limited, Hugging Face is unconfigured, and OpenRouter is not in the automatic fallback array; these remain visible for manual diagnostics without adding latency to mission execution.
const fallbacks: ProviderName[] = ["cloudflare", "groq", "cerebras"];

function text(data: any): string {
  const content = data?.choices?.[0]?.message?.content ?? data?.text ?? data?.output;
  if (typeof content === "string" && content.trim()) return content.trim();
  throw new Error("AI provider returned no usable text.");
}

type ProviderUsage = { provider: ProviderName; model: string; promptTokens?: number; completionTokens?: number; totalTokens?: number; reportedCostUsd?: number; capturedAt: number };
type UsageRecorder = (usage: ProviderUsage) => Promise<void>;

async function call(provider: ProviderName, prompt: string, maxTokens: number, onUsage?: UsageRecorder): Promise<string> {
  const cfg = providers[provider];
  const rawKey = process.env[cfg.key]?.trim();
  const key = rawKey?.replace(/^["']|["']$/g, "").trim();
  if (provider === "cloudflare" && !process.env.CLOUDFLARE_ACCOUNT_ID?.trim()) throw new Error("Cloudflare is not configured: set CLOUDFLARE_ACCOUNT_ID.");
  if (!key) throw new Error(`${provider} is not configured.`);
  const model = process.env[`${provider.toUpperCase()}_MODEL`]?.trim() || process.env[`${cfg.key}_MODEL`]?.trim() || cfg.model;
  const openRouterModels = provider === "openrouter"
    ? [model, process.env.OPENROUTER_SECONDARY_MODEL?.trim() || "meta-llama/llama-3.3-70b-instruct:free", "openrouter/free"]
        .filter((candidate, index, all) => Boolean(candidate) && all.indexOf(candidate) === index)
    : undefined;
  const boundedPrompt = prompt.length > 8000
    ? `${prompt.slice(0, 5000)}\n\n...[context truncated for provider limits]...\n\n${prompt.slice(-2000)}`
    : prompt;
  const boundedMaxTokens = Math.min(maxTokens, 3000);
  const endpoint = provider === "cloudflare"
    ? `${cfg.url}/${process.env.CLOUDFLARE_ACCOUNT_ID?.trim()}/ai/v1/chat/completions`
    : `${cfg.url}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    signal: AbortSignal.timeout(25000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...(provider === "openrouter" ? { "HTTP-Referer": "https://bphntw8kdojl9qvuifywyjtk.macaly.app", "X-Title": "NEXUS FORGE" } : {}),
    },
    body: JSON.stringify({ ...(openRouterModels ? { models: openRouterModels } : { model }), messages: [{ role: "user", content: boundedPrompt }], max_tokens: boundedMaxTokens, temperature: 0.15 }),
  });
  const body = await response.text();
  if (!response.ok) {
    const detail = body.slice(0, 220).replace(/\s+/g, " ").trim();
    const retryable = response.status === 408 || response.status === 409 || response.status === 425 || response.status === 429 || response.status >= 500;
    const error = new Error(`${provider} failed (${response.status}${retryable ? ", retryable" : ", non-retryable"}): ${detail}`);
    (error as Error & { retryable?: boolean; provider?: string; status?: number }).retryable = retryable;
    (error as Error & { provider?: string }).provider = provider;
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  const payload = JSON.parse(body);
  if (onUsage) {
    const usage = payload?.usage ?? payload?.result?.usage ?? {};
    const rawCost = payload?.usage?.cost ?? payload?.cost ?? payload?.result?.cost;
    const reportedCostUsd = typeof rawCost === "number" && Number.isFinite(rawCost) && rawCost >= 0 ? rawCost : undefined;
    const promptTokens = Number.isFinite(usage.prompt_tokens) ? usage.prompt_tokens : Number.isFinite(usage.input_tokens) ? usage.input_tokens : undefined;
    const completionTokens = Number.isFinite(usage.completion_tokens) ? usage.completion_tokens : Number.isFinite(usage.output_tokens) ? usage.output_tokens : undefined;
    const totalTokens = Number.isFinite(usage.total_tokens) ? usage.total_tokens : promptTokens !== undefined || completionTokens !== undefined ? (promptTokens ?? 0) + (completionTokens ?? 0) : undefined;
    if (promptTokens !== undefined || completionTokens !== undefined || reportedCostUsd !== undefined) {
      await onUsage({ provider, model, promptTokens, completionTokens, totalTokens, reportedCostUsd, capturedAt: Date.now() });
    }
  }
  return text(payload);
}

export async function callAiProvider(role: ChatRole, prompt: string, maxTokens: number, onUsage?: UsageRecorder): Promise<string> {
  const ordered = [routes[role], ...fallbacks.filter((p) => p !== routes[role])];
  const configured = ordered.filter((p) => Boolean(process.env[providers[p].key]?.trim()) && (p !== "cloudflare" || Boolean(process.env.CLOUDFLARE_ACCOUNT_ID?.trim())));
  if (!configured.length) throw new Error("No AI providers configured. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID, GROQ_API_KEY, or CEREBRAS_API_KEY.");
  const failures: string[] = [];
  for (const provider of configured) {
    try { return await call(provider, prompt, maxTokens, onUsage); }
    catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      failures.push(failure.message);
      // Fail over on every provider failure, not only HTTP statuses marked retryable.
      // Authentication, quota, model availability, and network failures are provider-local;
      // another configured provider may still complete the same bounded request.
    }
  }
  throw new Error(`All configured AI providers failed: ${failures.join(" | ")}`);
}

export const COUNCIL_MODELS = {
  planner: "planner" as const,
  wave1: "wave1" as const,
  wave2: "wave2" as const,
  critic: "critic" as const,
  research: "research" as const,
};

export const AI_PROVIDER_PLAN = {
  planner: "Groq with Cloudflare Workers AI fallback",
  wave1: "Groq with Cloudflare Workers AI fallback",
  wave2: "Cerebras with Cloudflare Workers AI fallback",
  critic: "Cerebras with Cloudflare Workers AI fallback",
  research: "Groq with Cloudflare Workers AI fallback",
  openrouter: "Manual diagnostic configuration only; not included in automatic routing until inference and quota reliability are confirmed",
  huggingface: "Deferred from automatic routing until a key is configured and inference is verified",
  fallbackOrder: "Role primary (Groq/Cerebras) → Cloudflare Workers AI → the other selected primary provider (Cerebras/Groq); OpenRouter is manual-only, while Mistral and Hugging Face are deferred",
} as const;
