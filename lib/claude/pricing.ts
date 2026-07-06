import "server-only";

// USD per 1M tokens. Centralized so AI Costs stays accurate as pricing
// changes without touching every call site.
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5-20251001": { input: 3, output: 15 },
  "claude-opus-4-8": { input: 15, output: 75 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4 },
};

const FALLBACK_PRICING = { input: 3, output: 15 };

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number) {
  const pricing = PRICING[model] ?? FALLBACK_PRICING;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}
