"use client";

import { useRouter } from "next/navigation";

import { RiskCard } from "@/components/RiskCard";
import type { RegionStatus } from "@/lib/types";

type RegionGridProps = {
  regions: RegionStatus[];
  isLoading?: boolean;
};

function normalizeConfidence(confidence: number): number {
  return confidence <= 1 ? confidence * 100 : confidence;
}

export function RegionGrid({ regions, isLoading = false }: RegionGridProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <RiskCard
            key={`skeleton-${index}`}
            location="Loading"
            state="Loading"
            riskLevel="NORMAL"
            riskType="NONE"
            confidence={0}
            lastUpdated="--"
            onClick={() => undefined}
            isLoading
          />
        ))}
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {regions.map((region) => {
        const searchParams = new URLSearchParams({
          lat: String(region.latitude),
          lng: String(region.longitude),
          location: region.name,
        });

        return (
          <RiskCard
            key={region.name}
            location={region.name}
            state={region.state}
            riskLevel={region.latest_risk.risk_level}
            riskType={
              region.latest_risk.risk_type === "LANDSLIDE"
                ? "FLOOD"
                : region.latest_risk.risk_type
            }
            confidence={normalizeConfidence(region.latest_risk.confidence)}
            lastUpdated="Updated just now"
            onClick={() => router.push(`/map?${searchParams.toString()}`)}
          />
        );
      })}
    </section>
  );
}
