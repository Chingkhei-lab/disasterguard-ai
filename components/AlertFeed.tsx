"use client";

import { AlertTriangle, CloudRain, Flame, Mountain, Wind } from "lucide-react";
import { useEffect, useState } from "react";

import type { AlertLog } from "@/lib/types";

const REFRESH_MS = 5 * 60 * 1000;

function formatTimeAgo(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function getRiskIcon(riskType: AlertLog["risk_type"]) {
  if (riskType === "FLOOD") {
    return <CloudRain className="h-4 w-4 text-sky-300" aria-hidden="true" />;
  }
  if (riskType === "CYCLONE") {
    return <Wind className="h-4 w-4 text-indigo-300" aria-hidden="true" />;
  }
  if (riskType === "HEATWAVE") {
    return <Flame className="h-4 w-4 text-amber-300" aria-hidden="true" />;
  }
  if (riskType === "LANDSLIDE") {
    return <Mountain className="h-4 w-4 text-emerald-300" aria-hidden="true" />;
  }
  return <AlertTriangle className="h-4 w-4 text-slate-300" aria-hidden="true" />;
}

export function AlertFeed() {
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadAlerts = async () => {
      try {
        const { getAlertHistory } = await import("@/lib/supabase");
        const data = await getAlertHistory(10);
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
    const intervalId = window.setInterval(() => {
      void loadAlerts();
    }, REFRESH_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <aside className="rounded-xl border border-[#475569] bg-[#1e293b] p-4">
      <h2 className="mb-3 text-lg font-bold text-white">Alert Feed</h2>

      <div className="h-[420px] space-y-3 overflow-y-auto pr-1">
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`alert-skeleton-${index}`}
                className="animate-pulse rounded-lg border border-slate-600 bg-slate-700/60 p-3"
              >
                <div className="mb-2 h-4 w-3/5 rounded bg-slate-500/60" />
                <div className="h-3 w-2/5 rounded bg-slate-500/50" />
              </div>
            ))
          : null}

        {!isLoading && alerts.length === 0 ? (
          <p className="rounded-lg border border-slate-600 bg-slate-800/70 p-3 text-sm text-slate-300">
            No alerts in the last 24 hours
          </p>
        ) : null}

        {!isLoading
          ? alerts.map((alert) => (
              <article
                key={alert.id}
                className="rounded-lg border border-slate-600 bg-slate-800/70 p-3 text-slate-100"
              >
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                  {getRiskIcon(alert.risk_type)}
                  <span>{alert.location_name}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>{alert.risk_level}</span>
                  <span>{formatTimeAgo(alert.delivered_at)}</span>
                </div>
              </article>
            ))
          : null}
      </div>
    </aside>
  );
}
