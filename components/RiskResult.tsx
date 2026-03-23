"use client";

import { useEffect, useState } from "react";

import { ALERT_TEMPLATES, COLORS } from "@/lib/constants";
import type { PredictResponse, WeatherData } from "@/lib/types";

type RiskResultProps = {
  result: PredictResponse;
  location: string;
  weatherData: WeatherData | null;
};

const RISK_BG_CLASS = {
  NORMAL: "bg-[#16a34a]",
  MODERATE: "bg-[#d97706]",
  HIGH: "bg-[#ea580c]",
  CRITICAL: "bg-[#dc2626]",
} as const;

function getFallbackBriefing(location: string): string {
  return `✅ Conditions normal for ${location} tomorrow. No immediate threats detected.`;
}

function confidenceToPercent(confidence: number): number {
  const scaled = confidence <= 1 ? confidence * 100 : confidence;
  return Math.max(0, Math.min(100, Math.round(scaled)));
}

export function RiskResult({ result, location, weatherData }: RiskResultProps) {
  const [briefing, setBriefing] = useState<string>(getFallbackBriefing(location));
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);
  const confidencePercent = confidenceToPercent(result.confidence);

  useEffect(() => {
    if (result.risk_level === "NORMAL" || !weatherData) {
      setBriefing(getFallbackBriefing(location));
      return;
    }

    let isMounted = true;

    const loadBriefing = async () => {
      setIsBriefingLoading(true);

      try {
        const response = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            riskLevel: result.risk_level,
            riskType: result.risk_type,
            location,
            weatherData,
          }),
        });

        const payload = (await response.json()) as {
          success: boolean;
          data?: { briefing?: string };
        };

        if (isMounted && payload.success && payload.data?.briefing) {
          setBriefing(payload.data.briefing);
        }
      } catch {
        if (isMounted) {
          setBriefing(getFallbackBriefing(location));
        }
      } finally {
        if (isMounted) {
          setIsBriefingLoading(false);
        }
      }
    };

    void loadBriefing();

    return () => {
      isMounted = false;
    };
  }, [location, result.risk_level, result.risk_type, weatherData]);

  return (
    <section className="space-y-4 rounded-xl border border-[#475569] bg-[#1e293b] p-4">
      <div className={`${RISK_BG_CLASS[result.risk_level]} rounded-lg p-4 text-white`} data-risk-bg={COLORS[result.risk_level].bg}>
        <p className="text-xs uppercase tracking-wider text-white/80">Risk Level</p>
        <p className="mt-1 text-3xl font-extrabold">{result.risk_level}</p>
        <p className="mt-1 text-sm font-semibold">{result.risk_type}</p>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
          <span>Confidence</span>
          <span>{confidencePercent}%</span>
        </div>
        <progress className="h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-slate-700 [&::-webkit-progress-value]:bg-[#3b82f6]" max={100} value={confidencePercent} />
      </div>

      {result.fallback_used ? (
        <span className="inline-block rounded-full border border-yellow-500/60 bg-yellow-400/20 px-3 py-1 text-xs font-semibold text-yellow-200">
          Rule-based fallback active
        </span>
      ) : null}

      <div className="rounded-lg bg-slate-800/70 p-3">
        <p className="text-xs uppercase tracking-wide text-slate-300">AI Briefing</p>
        {isBriefingLoading ? (
          <div className="mt-2 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-slate-600" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-slate-600" />
          </div>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-slate-100">{briefing}</p>
        )}
      </div>
    </section>
  );
}
