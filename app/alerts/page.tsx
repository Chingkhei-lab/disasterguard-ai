"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

import { TARGET_REGIONS } from "@/lib/constants";
import type { AlertLog, RiskLevel, RiskType } from "@/lib/types";

const RISK_LEVELS: Array<"ALL" | RiskLevel> = ["ALL", "NORMAL", "MODERATE", "HIGH", "CRITICAL"];
const RISK_TYPES: Array<"ALL" | RiskType> = ["ALL", "FLOOD", "CYCLONE", "HEATWAVE", "NONE"];

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });
}

function rowClass(riskLevel: RiskLevel): string {
  if (riskLevel === "CRITICAL") return "bg-red-950/30";
  if (riskLevel === "HIGH") return "bg-orange-950/30";
  if (riskLevel === "MODERATE") return "bg-amber-950/30";
  return "bg-emerald-950/25";
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | RiskType>("ALL");
  const [levelFilter, setLevelFilter] = useState<"ALL" | RiskLevel>("ALL");
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    let isMounted = true;

    const loadAlerts = async () => {
      try {
        const { getAlertHistory } = await import("@/lib/supabase");
        const data = await getAlertHistory(200);
        if (isMounted) {
          setAlerts(data);
        }
      } catch {
        if (isMounted) {
          setAlerts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadAlerts();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const regionMatch = regionFilter === "ALL" || alert.location_name === regionFilter;
      const typeMatch = typeFilter === "ALL" || alert.risk_type === typeFilter;
      const levelMatch = levelFilter === "ALL" || alert.risk_level === levelFilter;
      return regionMatch && typeMatch && levelMatch;
    });
  }, [alerts, levelFilter, regionFilter, typeFilter]);

  const visibleAlerts = filteredAlerts.slice(0, visibleCount);

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <select
          value={regionFilter}
          onChange={(event) => setRegionFilter(event.target.value)}
          className="h-11 rounded-lg border border-[#475569] bg-[#1e293b] px-3 text-sm text-slate-100"
        >
          <option value="ALL">All Regions</option>
          {TARGET_REGIONS.map((region) => (
            <option key={region.name} value={region.name}>
              {region.name}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as "ALL" | RiskType)}
          className="h-11 rounded-lg border border-[#475569] bg-[#1e293b] px-3 text-sm text-slate-100"
        >
          {RISK_TYPES.map((type) => (
            <option key={type} value={type}>
              {type === "ALL" ? "All Types" : type}
            </option>
          ))}
        </select>

        <select
          value={levelFilter}
          onChange={(event) => setLevelFilter(event.target.value as "ALL" | RiskLevel)}
          className="h-11 rounded-lg border border-[#475569] bg-[#1e293b] px-3 text-sm text-slate-100"
        >
          {RISK_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level === "ALL" ? "All Levels" : level}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#475569] bg-[#1e293b]">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-300">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Risk Level</th>
              <th className="px-4 py-3">Risk Type</th>
              <th className="px-4 py-3">Briefing</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="border-t border-slate-700/70">
                    <td className="px-4 py-4" colSpan={5}>
                      <div className="h-4 w-full animate-pulse rounded bg-slate-700/70" />
                    </td>
                  </tr>
                ))
              : null}

            {!isLoading && visibleAlerts.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-300" colSpan={5}>
                  No alerts recorded yet. Alerts will appear here after the first morning run.
                </td>
              </tr>
            ) : null}

            {!isLoading
              ? visibleAlerts.map((alert) => {
                  const expanded = expandedIds.includes(alert.id);
                  return (
                    <Fragment key={alert.id}>
                      <tr
                        className={`${rowClass(alert.risk_level)} cursor-pointer border-t border-slate-700/70`}
                        onClick={() => toggleExpanded(alert.id)}
                      >
                        <td className="px-4 py-3 text-slate-100">{formatTime(alert.delivered_at)}</td>
                        <td className="px-4 py-3 text-slate-100">{alert.location_name}</td>
                        <td className="px-4 py-3 font-semibold text-slate-100">{alert.risk_level}</td>
                        <td className="px-4 py-3 text-slate-100">{alert.risk_type}</td>
                        <td className="px-4 py-3 text-slate-200">
                          {expanded
                            ? alert.alert_text
                            : `${alert.alert_text.slice(0, 80)}${alert.alert_text.length > 80 ? "..." : ""}`}
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="border-t border-slate-700/70 bg-slate-900/45">
                          <td className="px-4 py-3 text-slate-200" colSpan={5}>
                            {alert.alert_text}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              : null}
          </tbody>
        </table>
      </div>

      {!isLoading && filteredAlerts.length > visibleCount ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + 20)}
            className="h-10 rounded-lg bg-[#3b82f6] px-4 text-sm font-semibold text-white transition hover:bg-[#2563eb]"
          >
            Load More
          </button>
        </div>
      ) : null}
    </main>
  );
}
