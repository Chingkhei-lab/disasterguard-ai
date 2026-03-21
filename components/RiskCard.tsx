import type { RegionStatus, RiskLevel, RiskType } from "@/lib/types";
import { COLORS } from "@/lib/constants";

type RiskCardProps = {
  location: string;
  state: string;
  riskLevel: RiskLevel;
  riskType: RiskType;
  confidence: number;
  lastUpdated: string;
  onClick: () => void;
  isLoading?: boolean;
};

type RiskCardRegionPreview = Pick<RegionStatus, "name" | "state">;

const BACKGROUND_CLASS_BY_LEVEL: Record<RiskLevel, string> = {
  NORMAL: "bg-[#16a34a] hover:bg-[#15803d]",
  MODERATE: "bg-[#d97706] hover:bg-[#b45309]",
  HIGH: "bg-[#ea580c] hover:bg-[#c2410c]",
  CRITICAL: "bg-[#dc2626] hover:bg-[#b91c1c]",
};

const BADGE_CLASS_BY_LEVEL: Record<RiskLevel, string> = {
  NORMAL: "bg-[#dcfce7] text-[#166534]",
  MODERATE: "bg-[#fef3c7] text-[#92400e]",
  HIGH: "bg-[#ffedd5] text-[#9a3412]",
  CRITICAL: "bg-[#fee2e2] text-[#991b1b]",
};

function formatRegionLabel(region: RiskCardRegionPreview): string {
  return `${region.name}, ${region.state}`;
}

function getConfidencePercent(confidence: number): number {
  return Math.round(Math.min(Math.max(confidence, 0), 100));
}

export function RiskCard({
  location,
  state,
  riskLevel,
  riskType,
  confidence,
  lastUpdated,
  onClick,
  isLoading = false,
}: RiskCardProps) {
  if (isLoading) {
    return (
      <div className="min-h-[176px] animate-pulse rounded-xl border border-slate-600 bg-slate-700/60 p-5">
        <div className="mb-6 h-6 w-2/3 rounded bg-slate-500/70" />
        <div className="mb-2 h-4 w-1/3 rounded bg-slate-500/50" />
        <div className="mb-6 h-7 w-1/2 rounded bg-slate-500/60" />
        <div className="flex items-center justify-between">
          <div className="h-4 w-1/3 rounded bg-slate-500/50" />
          <div className="h-4 w-1/4 rounded bg-slate-500/50" />
        </div>
      </div>
    );
  }

  const regionLabel = formatRegionLabel({ name: location, state });
  const confidencePercent = getConfidencePercent(confidence);
  const backgroundClass = BACKGROUND_CLASS_BY_LEVEL[riskLevel];
  const badgeClass = BADGE_CLASS_BY_LEVEL[riskLevel];
  const criticalClass = riskLevel === "CRITICAL" ? "critical-card" : "";

  const riskPalette = COLORS[riskLevel];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open details for ${regionLabel}`}
      title={`${riskLevel} ${riskType}`}
      className={`${backgroundClass} ${criticalClass} w-full cursor-pointer rounded-xl border border-white/20 p-5 text-left text-white transition-colors`}
      data-badge-color={riskPalette.badge}
    >
      <div className="mb-4">
        <h3 className="text-2xl font-bold leading-tight">{location}</h3>
        <p className="text-sm text-slate-100/85">{state}</p>
      </div>

      <div className="mb-5 flex items-center justify-between gap-3">
        <span className={`${badgeClass} rounded-full px-3 py-1 text-xs font-extrabold tracking-wide`}>
          {riskLevel}
        </span>
        <p className="text-sm font-semibold tracking-wide text-white">{riskType}</p>
      </div>

      <div className="flex items-center justify-between text-sm">
        <p className="font-semibold">Confidence: {confidencePercent}%</p>
        <p className="text-slate-100/85">{lastUpdated}</p>
      </div>
    </button>
  );
}
