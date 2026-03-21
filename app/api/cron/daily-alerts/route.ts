import axios from "axios";
import { NextResponse } from "next/server";

import { ALERT_TEMPLATES } from "@/lib/constants";
import { getSubscriptions, saveAlertLog } from "@/lib/supabase";
import type { PredictResponse, RiskLevel, Subscription, WeatherData } from "@/lib/types";

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

function readFirst(values: number[] | undefined): number {
  const value = values?.[0];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toWeatherData(data: WeatherApiData): WeatherData {
  const hourly = data.hourly ?? {};
  const rain = hourly.rain ?? [];

  return {
    rain_current: readFirst(rain),
    rain_24h_forecast: rain.slice(0, 24).reduce((sum, value) => sum + (value ?? 0), 0),
    wind_speed: readFirst(hourly.windspeed_10m),
    wind_gusts: readFirst(hourly.windgusts_10m),
    temperature: readFirst(hourly.temperature_2m),
    humidity: readFirst(hourly.relativehumidity_2m),
    pressure: readFirst(hourly.surface_pressure),
    soil_moisture: readFirst(hourly.soil_moisture_0_to_1cm),
  };
}

function buildAlertText(riskLevel: RiskLevel, riskType: PredictResponse["risk_type"], location: string): string {
  const safeLocation = location || "your area";

  if (riskLevel === "CRITICAL" && riskType === "FLOOD") {
    return ALERT_TEMPLATES.FLOOD_CRITICAL.replace("{location}", safeLocation);
  }
  if (riskLevel === "CRITICAL" && riskType === "CYCLONE") {
    return ALERT_TEMPLATES.CYCLONE_CRITICAL.replace("{location}", safeLocation);
  }
  if (riskLevel === "HIGH" && riskType === "FLOOD") {
    return ALERT_TEMPLATES.FLOOD_HIGH.replace("{location}", safeLocation);
  }
  if (riskLevel === "HIGH" && riskType === "CYCLONE") {
    return ALERT_TEMPLATES.CYCLONE_HIGH.replace("{location}", safeLocation);
  }
  if (riskType === "HEATWAVE") {
    return ALERT_TEMPLATES.HEATWAVE_HIGH.replace("{location}", safeLocation);
  }

  return `⚠️ ${riskLevel} ${riskType} alert for ${safeLocation}. Stay alert and follow local guidance.`;
}

async function processSubscription(
  origin: string,
  token: string,
  subscription: Subscription,
): Promise<boolean> {
  const weatherRes = await fetch(
    `${origin}/api/weather?lat=${subscription.latitude}&lng=${subscription.longitude}`,
    { method: "GET", cache: "no-store" },
  );

  if (!weatherRes.ok) {
    throw new Error(`Weather fetch failed for ${subscription.location_name}`);
  }

  const weatherPayload = (await weatherRes.json()) as ApiResponse<WeatherApiData>;
  const weatherData = toWeatherData(weatherPayload.data);

  const riskRes = await fetch(`${origin}/api/risk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(weatherData),
    cache: "no-store",
  });

  if (!riskRes.ok) {
    throw new Error(`Risk fetch failed for ${subscription.location_name}`);
  }

  const riskPayload = (await riskRes.json()) as ApiResponse<PredictResponse>;
  const result = riskPayload.data;

  if (result.risk_level === "NORMAL") {
    return false;
  }

  const alertText = buildAlertText(result.risk_level, result.risk_type, subscription.location_name);

  await axios.post(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      chat_id: subscription.telegram_id,
      text: alertText,
    },
    {
      timeout: 10_000,
    },
  );

  if (subscription.alert_mode === "voice" || subscription.alert_mode === "both") {
    console.log("voice pending", subscription.telegram_id);
  }

  await saveAlertLog({
    telegram_id: subscription.telegram_id,
    risk_level: result.risk_level,
    risk_type: result.risk_type,
    location_name: subscription.location_name,
    alert_text: alertText,
    was_voice: false,
  });

  return true;
}

export async function GET(request: Request) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json(
        { success: false, data: null, processed: 0, error: "Missing TELEGRAM_BOT_TOKEN" },
        { status: 500 },
      );
    }

    const origin = new URL(request.url).origin;
    const subscriptions = await getSubscriptions();

    let processed = 0;

    for (const subscription of subscriptions) {
      try {
        const sent = await processSubscription(origin, token, subscription);
        if (sent) {
          processed += 1;
        }
      } catch (error) {
        console.error("daily-alerts subscription failed", {
          telegramId: subscription.telegram_id,
          location: subscription.location_name,
          error: error instanceof Error ? error.message : "unknown error",
        });
      }
    }

    return NextResponse.json({ success: true, data: { processed }, processed, error: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Daily alerts cron failed";
    return NextResponse.json(
      { success: false, data: null, processed: 0, error: message },
      { status: 500 },
    );
  }
}
