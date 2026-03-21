import type { Metadata } from "next";
import { headers } from "next/headers";

import { AlertFeed } from "@/components/AlertFeed";
import { HeroStrip } from "@/components/HeroStrip";
import { RegionGrid } from "@/components/RegionGrid";
import { TARGET_REGIONS } from "@/lib/constants";
import type { PredictResponse, RegionStatus, WeatherData } from "@/lib/types";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  error: string | null;
};

type WeatherApiData = {
  hourly: {
    rain?: number[];
    soil_moisture_0_to_1cm?: number[];
    windspeed_10m?: number[];
    windgusts_10m?: number[];
    temperature_2m?: number[];
    relativehumidity_2m?: number[];
    surface_pressure?: number[];
  };
};

export const metadata: Metadata = {
  title: "DisasterGuard AI — Dashboard",
};

function getCurrentTimeIst(): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

async function getBaseUrl(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";

  if (host) {
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function toNumber(value: number[] | undefined, index = 0): number {
  const candidate = value?.[index];
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : 0;
}

function buildWeatherPayload(hourly: WeatherApiData["hourly"]): WeatherData {
  const rainSeries = hourly.rain ?? [];
  const rain24hForecast = rainSeries.slice(0, 24).reduce((sum, value) => sum + (value ?? 0), 0);

  return {
    rain_current: toNumber(rainSeries, 0),
    rain_24h_forecast: rain24hForecast,
    wind_speed: toNumber(hourly.windspeed_10m, 0),
    wind_gusts: toNumber(hourly.windgusts_10m, 0),
    temperature: toNumber(hourly.temperature_2m, 0),
    humidity: toNumber(hourly.relativehumidity_2m, 0),
    pressure: toNumber(hourly.surface_pressure, 0),
    soil_moisture: toNumber(hourly.soil_moisture_0_to_1cm, 0),
  };
}

const DEFAULT_PREDICT: PredictResponse = {
  risk_level: "NORMAL",
  risk_type: "NONE",
  confidence: 0,
  fallback_used: true,
};

async function getRegionStatus(baseUrl: string): Promise<RegionStatus[]> {
  const statuses = await Promise.all(
    TARGET_REGIONS.map(async (region) => {
      try {
        const weatherUrl = `${baseUrl}/api/weather?lat=${region.lat}&lng=${region.lng}`;
        const weatherRes = await fetch(weatherUrl, { method: "GET", cache: "no-store" });
        if (!weatherRes.ok) {
          throw new Error(`Weather API failed for ${region.name}`);
        }

        const weatherPayload = (await weatherRes.json()) as ApiResponse<WeatherApiData>;
        const weatherData = buildWeatherPayload(weatherPayload.data?.hourly ?? {});

        const riskRes = await fetch(`${baseUrl}/api/risk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(weatherData),
          cache: "no-store",
        });

        if (!riskRes.ok) {
          throw new Error(`Risk API failed for ${region.name}`);
        }

        const riskPayload = (await riskRes.json()) as ApiResponse<PredictResponse>;

        return {
          name: region.name,
          state: region.state,
          latitude: region.lat,
          longitude: region.lng,
          latest_risk: riskPayload.success ? riskPayload.data : DEFAULT_PREDICT,
        } satisfies RegionStatus;
      } catch {
        return {
          name: region.name,
          state: region.state,
          latitude: region.lat,
          longitude: region.lng,
          latest_risk: DEFAULT_PREDICT,
        } satisfies RegionStatus;
      }
    }),
  );

  return statuses;
}

export default async function HomePage() {
  const baseUrl = await getBaseUrl();
  const regions = await getRegionStatus(baseUrl);
  const lastUpdated = getCurrentTimeIst();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <HeroStrip regions={regions} lastUpdated={lastUpdated} />

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RegionGrid regions={regions} />
        </div>
        <div className="lg:col-span-1">
          <AlertFeed />
        </div>
      </section>
    </main>
  );
}
