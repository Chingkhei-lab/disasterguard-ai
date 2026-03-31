"use client";

import { COLORS } from "@/lib/constants";
import type { RegionStatus, RiskLevel } from "@/lib/types";

const RISK_ORDER: RiskLevel[] = ["NORMAL", "MODERATE", "HIGH", "CRITICAL"];

const COLOR_HEX_BY_LEVEL: Record<RiskLevel, string> = {
  NORMAL: COLORS.NORMAL.bg,
  MODERATE: COLORS.MODERATE.bg,
  HIGH: COLORS.HIGH.bg,
  CRITICAL: COLORS.CRITICAL.bg,
};

const STRIP_CLASS_BY_HEX: Record<string, string> = {
  "#16a34a": "bg-[#16a34a]",
  "#d97706": "bg-[#d97706]",
  "#ea580c": "bg-[#ea580c]",
  "#dc2626": "bg-[#dc2626]",
};

type HeroStripProps = {
  regions: RegionStatus[];
  lastUpdated: string;
};

function getWorstLevel(regions: RegionStatus[]): RiskLevel {
  let worst: RiskLevel = "NORMAL";

  for (const region of regions) {
    const current = region.latest_risk.risk_level;
    if (RISK_ORDER.indexOf(current) > RISK_ORDER.indexOf(worst)) {
      worst = current;
    }
  }

  return worst;
}

export function HeroStrip({ regions, lastUpdated }: HeroStripProps) {
  const worstLevel = getWorstLevel(regions);
  const stripColorClass = STRIP_CLASS_BY_HEX[COLOR_HEX_BY_LEVEL[worstLevel]] ?? "bg-[#1e293b]";
  const statusText = worstLevel === "NORMAL"
    ? "All Clear — No Active Threats"
    : `${worstLevel} WARNING`;

  return (
    <section className={`${stripColorClass} rounded-xl border border-white/20 p-4 text-white`}>
      <p className="text-sm font-medium">Last updated: {lastUpdated} IST</p>
      <p className="mt-1 text-lg font-bold">Overall status: {statusText}</p>
    </section>
  );
}
