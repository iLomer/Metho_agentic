interface CostBannerProps {
  totalMonthlyCost: number;
  activeProjectCount: number;
  deadCostCount: number;
  deadCostTotal: number;
  onDeadCostClick: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function CostBanner({
  totalMonthlyCost,
  activeProjectCount,
  deadCostCount,
  deadCostTotal,
  onDeadCostClick,
}: CostBannerProps) {
  const isZero = totalMonthlyCost === 0;
  const hasDeadCost = deadCostCount > 0 && deadCostTotal > 0;

  return (
    <div className="mb-4 border-b border-neutral-800/60 pb-4">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-2xl font-semibold tabular-nums text-neutral-100">
            {formatCurrency(totalMonthlyCost)}
          </span>
          <span className="font-mono text-xs text-neutral-600">/mo</span>
        </div>

        <span className="font-mono text-xs text-neutral-600">
          {isZero
            ? "no running costs"
            : `${activeProjectCount} active`}
        </span>
      </div>

      {hasDeadCost && (
        <button
          type="button"
          onClick={onDeadCostClick}
          className="mt-2 flex items-center gap-1.5 font-mono text-xs text-amber-500 transition-colors hover:text-amber-400"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
          {deadCostCount} inactive still costing {formatCurrency(deadCostTotal)}/mo
        </button>
      )}
    </div>
  );
}
