import axios from "axios";
import { NextResponse } from "next/server";

import { ALERT_TEMPLATES } from "@/lib/constants";
import { getSubscriptions, saveAlertLog } from "@/lib/supabase";
import type { PredictResponse, RiskLevel, Subscription, WeatherData } from "@/lib/types";

export const dynamic = "force-dynamic";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  error: string | null;
};

// Removed WeatherApiData, readFirst, and toWeatherData functions since we're using the pre-aggregated data from the API now.

function buildAlertText(
  riskLevel: RiskLevel,
  riskType: PredictResponse["risk_type"],
  location: string,
  date: string,
  weatherData: WeatherData,
  confidence: number,
): string {
  const safeLocation = location || "your area";
  let actionText = "";

  if (riskLevel === "CRITICAL" && riskType === "FLOOD") {
    actionText = ALERT_TEMPLATES.FLOOD_CRITICAL;
  } else if (riskLevel === "CRITICAL" && riskType === "CYCLONE") {
    actionText = ALERT_TEMPLATES.CYCLONE_CRITICAL;
  } else if (riskLevel === "CRITICAL" && riskType === "HEATWAVE") {
    // We added HEATWAVE_CRITICAL to constants
    actionText = (ALERT_TEMPLATES as any).HEATWAVE_CRITICAL || "🔴 CRITICAL Heat Alert for {location} tomorrow. Extreme heat expected. Stay indoors.";
  } else if (riskLevel === "HIGH" && riskType === "FLOOD") {
    actionText = ALERT_TEMPLATES.FLOOD_HIGH;
  } else if (riskLevel === "HIGH" && riskType === "CYCLONE") {
    actionText = ALERT_TEMPLATES.CYCLONE_HIGH;
  } else if (riskType === "HEATWAVE") {
    actionText = ALERT_TEMPLATES.HEATWAVE_HIGH;
  }

  if (actionText) {
    actionText = actionText.replace("{location}", safeLocation);
  } else {
    actionText = `Stay alert and follow local guidance.`;
  }

  const emoji =
    riskLevel === "CRITICAL" ? "🔴"
      : riskLevel === "HIGH" ? "⚠️"
        : riskLevel === "MODERATE" ? "🟡"
          : "⚪";
  const formatValue = (value: number): string => {
    if (!Number.isFinite(value)) {
      return "0";
    }

    const fixed = value.toFixed(1);
    return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
  };
  const confidencePercent = confidence <= 1 ? confidence * 100 : confidence;
  const confidenceText = Math.max(0, Math.min(100, Math.round(confidencePercent)));

  return `${emoji} DisasterGuard AI — ${riskLevel} ${riskType}
Tomorrow (${date}) for ${safeLocation}

Forecast:
• Rainfall: ${formatValue(weatherData.rain_24h_forecast)}mm expected
• Max wind: ${formatValue(weatherData.wind_speed)} km/h (gusts ${formatValue(weatherData.wind_gusts)} km/h)
• Temperature: ${formatValue(weatherData.temperature)}°C
• Humidity: ${formatValue(weatherData.humidity)}%

${actionText}

Confidence: ${confidenceText}%`;
}

async function processSubscription(
  token: string,
  subscription: Subscription,
): Promise<boolean> {
  console.log("Fetching weather for:", subscription.location_name, subscription.latitude, subscription.longitude);

  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.searchParams.set("latitude", subscription.latitude.toString());
  weatherUrl.searchParams.set("longitude", subscription.longitude.toString());
  weatherUrl.searchParams.set(
    "hourly",
    [
      "rain",
      "windspeed_10m",
      "windgusts_10m",
      "temperature_2m",
      "relativehumidity_2m",
      "surface_pressure",
    ].join(","),
  );
  weatherUrl.searchParams.set("forecast_days", "2");

  const weatherRes = await fetch(weatherUrl.toString(), {
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });

  if (!weatherRes.ok) {
    throw new Error(`Weather fetch failed for ${subscription.location_name}`);
  }

  const weatherJson = (await weatherRes.json()) as {
    hourly?: {
      rain: number[];
      windspeed_10m: number[];
      windgusts_10m: number[];
      temperature_2m: number[];
      relativehumidity_2m: number[];
      surface_pressure: number[];
    };
  };
  const hourly = weatherJson.hourly;

  if (!hourly) {
    throw new Error(`Weather response missing hourly data for ${subscription.location_name}`);
  }

  const tomorrowHours = {
    rain: hourly.rain.slice(24, 48),
    wind: hourly.windspeed_10m.slice(24, 48),
    gusts: hourly.windgusts_10m.slice(24, 48),
    temp: hourly.temperature_2m.slice(24, 48),
    humidity: hourly.relativehumidity_2m.slice(24, 48),
    pressure: hourly.surface_pressure.slice(24, 48),
  };

  const max = (arr: number[]) => Math.max(...arr);
  const min = (arr: number[]) => Math.min(...arr);
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const avg = (arr: number[]) => sum(arr) / arr.length;

  const weatherData: WeatherData = {
    rain_current: max(tomorrowHours.rain),
    rain_24h_forecast: sum(tomorrowHours.rain),
    wind_speed: max(tomorrowHours.wind),
    wind_gusts: max(tomorrowHours.gusts),
    temperature: max(tomorrowHours.temp),
    humidity: max(tomorrowHours.humidity),
    pressure: min(tomorrowHours.pressure),
    soil_moisture: (max(tomorrowHours.rain) / 100) * 0.6 + (avg(tomorrowHours.humidity) / 100) * 0.4,
  };
  console.log("Weather result:", JSON.stringify(weatherData));

  console.log("Calling ML service...");

  const riskRes = await fetch(`${process.env.ML_SERVICE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(weatherData),
    signal: AbortSignal.timeout(30_000),
  });

  if (!riskRes.ok) {
    throw new Error(`Risk fetch failed for ${subscription.location_name}`);
  }

  const result = (await riskRes.json()) as PredictResponse;
  console.log("Risk result:", JSON.stringify(result));

  if (result.risk_level === "NORMAL") {
    return false;
  }

  console.log("Sending alert for risk level:", result.risk_level);

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const forecastDate = tomorrowDate.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const alertText = buildAlertText(
    result.risk_level,
    result.risk_type,
    subscription.location_name,
    forecastDate,
    weatherData,
    result.confidence,
  );

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
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { success: false, data: null, error: "Unauthorized" },
        { status: 401 }
      )
    }
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json(
        { success: false, data: null, processed: 0, error: "Missing TELEGRAM_BOT_TOKEN" },
        { status: 500 },
      );
    }

    const subscriptions = await getSubscriptions();
    console.log("Found subscriptions:", subscriptions.length);

    // Wake up Render ML service before processing
    console.log("Waking up ML service...");
    try {
      await fetch(`${process.env.ML_SERVICE_URL}/health`, {
        signal: AbortSignal.timeout(60_000),
        cache: "no-store",
      });
      console.log("ML service is awake");
    } catch {
      console.log("ML service wake-up failed but continuing...");
    }

    let processed = 0;

    for (const subscription of subscriptions) {
      try {
        const sent = await processSubscription(token, subscription);
        if (sent) {
          processed += 1;
        }
      } catch (error) {
        console.error("Error at step subscription processing:", error instanceof Error ? error.message : error);
        console.error("daily-alerts subscription failed", {
          telegramId: subscription.telegram_id,
          location: subscription.location_name,
          error: error instanceof Error ? error.message : "unknown error",
        });
      }
    }

    return NextResponse.json({ success: true, data: { processed }, processed, error: null });
  } catch (error) {
    console.error("Error at step cron route:", error instanceof Error ? error.message : error);
    const message = error instanceof Error ? error.message : "Daily alerts cron failed";
    return NextResponse.json(
      { success: false, data: null, processed: 0, error: message },
      { status: 500 },
    );
  }
}
