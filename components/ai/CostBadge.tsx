import { formatCostUsd } from "@/lib/utils/format";

export function CostBadge({
  model,
  inputTokens,
  outputTokens,
  estimatedCostUsd,
}: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border-default bg-sand-100 px-3 py-1 text-xs text-text-secondary">
      <span className="font-mono">{model}</span>
      <span className="font-mono">{inputTokens + outputTokens} tok</span>
      <span className="font-mono font-medium text-text-primary">
        {formatCostUsd(estimatedCostUsd)}
      </span>
    </span>
  );
}
