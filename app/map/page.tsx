"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, Suspense } from "react";

import { RiskResult } from "@/components/RiskResult";
import type { DisasterMarkerData, FireMarkerData } from "@/components/Map";
import { WeatherPanel } from "@/components/WeatherPanel";
import type { PredictResponse, WeatherData } from "@/lib/types";
import { SUBSCRIBE_LOCATIONS } from "@/lib/constants";

const DynamicMap = dynamic(() => import("@/components/Map").then((module) => module.Map), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-slate-700/60" />,
});

type WeatherApiPayload = {
  success: boolean;
  data: {
    hourly?: {
      rain?: number[];
      soil_moisture_0_to_1cm?: number[];
      windspeed_10m?: number[];
      windgusts_10m?: number[];
      temperature_2m?: number[];
      relativehumidity_2m?: number[];
      surface_pressure?: number[];
    };
  };
};

function firstNumber(values: number[] | undefined): number {
  const value = values?.[0];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toWeatherData(payload: WeatherApiPayload["data"]): WeatherData {
  const hourly = payload.hourly ?? {};
  const rain = hourly.rain ?? [];

  return {
    rain_current: firstNumber(rain),
    rain_24h_forecast: rain.slice(0, 24).reduce((sum, value) => sum + (value ?? 0), 0),
    wind_speed: firstNumber(hourly.windspeed_10m),
    wind_gusts: firstNumber(hourly.windgusts_10m),
    temperature: firstNumber(hourly.temperature_2m),
    humidity: firstNumber(hourly.relativehumidity_2m),
    pressure: firstNumber(hourly.surface_pressure),
    soil_moisture: firstNumber(hourly.soil_moisture_0_to_1cm),
  };
}

function MapPageContent() {
  const params = useSearchParams();
  const [fires, setFires] = useState<FireMarkerData[]>([]);
  const [disasters, setDisasters] = useState<DisasterMarkerData[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState("Selected location");
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [riskResult, setRiskResult] = useState<PredictResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const subscribeHref = useMemo(() => {
    if (!selectedLocation) {
      return "/subscribe";
    }

    const search = new URLSearchParams({
      lat: String(selectedLocation.lat),
      lng: String(selectedLocation.lng),
      location: locationName,
    });
    return `/subscribe?${search.toString()}`;
  }, [locationName, selectedLocation]);

  useEffect(() => {
    const loadMarkers = async () => {
      try {
        const [firesRes, disastersRes] = await Promise.all([fetch("/api/fires"), fetch("/api/alerts")]);
        const firesPayload = (await firesRes.json()) as {
          success: boolean;
          data?: Array<{ latitude: number; longitude: number; bright_ti4: number; confidence: string; acq_date: string }>;
        };
        const disastersPayload = (await disastersRes.json()) as {
          success: boolean;
          data?: Array<Record<string, string>>;
        };

        if (firesPayload.success && firesPayload.data) {
          setFires(
            firesPayload.data.map((item) => ({
              lat: Number(item.latitude),
              lng: Number(item.longitude),
              brightness: Number(item.bright_ti4),
              confidence: item.confidence,
              acq_date: item.acq_date,
            })),
          );
        }

        if (disastersPayload.success && disastersPayload.data) {
          setDisasters(
            disastersPayload.data
              .map((item) => ({
                lat: Number(item["geo:lat"]),
                lng: Number(item["geo:long"]),
                title: String(item.title ?? "Disaster alert"),
                alertLevel: String(item["gdacs:alertlevel"] ?? "Unknown"),
                eventType: String(item["gdacs:eventtype"] ?? "Unknown"),
              }))
              .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng)),
          );
        }
      } catch {
        setFires([]);
        setDisasters([]);
      }
    };

    void loadMarkers();
  }, []);

  const analyzeLocation = async (lat: number, lng: number, label?: string) => {
    setSelectedLocation({ lat, lng });
    setLocationName(label ?? `Lat ${lat.toFixed(3)}, Lng ${lng.toFixed(3)}`);
    setIsAnalyzing(true);

    try {
      const weatherRes = await fetch(`/api/weather?lat=${lat}&lng=${lng}&tomorrow=true`);
      const weatherPayload = (await weatherRes.json()) as WeatherApiPayload;
      const weather = weatherPayload.data as any; // Ignore type since we changed the shape for tomorrow=true

      const riskRes = await fetch("/api/risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(weather),
      });

      const riskPayload = (await riskRes.json()) as {
        success: boolean;
        data: PredictResponse;
      };

      setWeatherData(weather);
      if (riskPayload.success) {
        setRiskResult(riskPayload.data);
      }
    } catch {
      setWeatherData(null);
      setRiskResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onLocationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const index = parseInt(e.target.value);
    if (isNaN(index)) return;
    const loc = SUBSCRIBE_LOCATIONS[index];
    void analyzeLocation(loc.lat, loc.lng, loc.name);
  };

  useEffect(() => {
    const latParam = params.get("lat");
    const lngParam = params.get("lng");
    const initialLocationName = params.get("location");

    if (!latParam || !lngParam) {
      return;
    }

    const lat = Number(latParam);
    const lng = Number(lngParam);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    void analyzeLocation(lat, lng, initialLocationName ?? "Selected location");
    // We intentionally read initial URL params once at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupedLocations = useMemo(() => {
    const groups: Record<string, { index: number; name: string; state: string }[]> = {};
    SUBSCRIBE_LOCATIONS.forEach((loc, index) => {
      if (!groups[loc.state]) groups[loc.state] = [];
      groups[loc.state].push({ ...loc, index });
    });
    return groups;
  }, []);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div className="flex gap-2">
          <select
            onChange={onLocationSelect}
            defaultValue=""
            className="h-11 w-full rounded-lg border border-[#475569] bg-[#1e293b] px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
          >
            <option value="" disabled>
              Select a location in NE India for analysis...
            </option>
            {Object.entries(groupedLocations).map(([state, locations]) => (
              <optgroup label={state} key={state}>
                {locations.map((loc) => (
                  <option value={loc.index} key={loc.index}>
                    {loc.name}, {loc.state}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-[600px] lg:col-span-2">
          <DynamicMap
            fires={fires}
            disasters={disasters}
            selectedLocation={selectedLocation}
            onLocationClick={(lat, lng) => {
              void analyzeLocation(lat, lng);
            }}
          />
        </div>

        <aside className="space-y-4 rounded-xl border border-[#475569] bg-[#1e293b] p-4 lg:col-span-1">
          <h2 className="text-lg font-bold text-white">Analysis Panel</h2>
          <p className="text-sm text-slate-300">Location: {locationName}</p>

          {!isAnalyzing && !weatherData && !riskResult ? (
            <div className="rounded-lg bg-slate-800/70 p-4 text-sm text-slate-300">
              Click anywhere on the map to analyze
            </div>
          ) : null}

          {isAnalyzing ? (
            <div className="space-y-3">
              <div className="h-24 animate-pulse rounded-lg bg-slate-700/60" />
              <div className="h-28 animate-pulse rounded-lg bg-slate-700/60" />
              <div className="h-12 animate-pulse rounded-lg bg-slate-700/60" />
            </div>
          ) : null}

          {weatherData && riskResult ? (
            <>
              <p className="text-sm font-semibold text-blue-400">
                Based on tomorrow's forecast
              </p>
              <WeatherPanel weatherData={weatherData} />
              <RiskResult result={riskResult} location={locationName} weatherData={weatherData} />
              <Link
                href={subscribeHref}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#3b82f6] px-4 text-sm font-semibold text-white transition hover:bg-[#2563eb]"
              >
                Subscribe to Alerts
              </Link>
            </>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-7xl px-4 py-6"><div className="h-[600px] animate-pulse rounded-xl bg-slate-700/60" /></div>}>
      <MapPageContent />
    </Suspense>
  );
}
