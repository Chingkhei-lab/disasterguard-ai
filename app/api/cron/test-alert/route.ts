import axios from "axios";
import { NextResponse } from "next/server";

import { ALERT_TEMPLATES } from "@/lib/constants";
import { getSubscriptions, saveAlertLog } from "@/lib/supabase";
import type { PredictResponse, RiskLevel, WeatherData } from "@/lib/types";

export const dynamic = "force-dynamic";

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
    actionText = (ALERT_TEMPLATES as { HEATWAVE_CRITICAL?: string }).HEATWAVE_CRITICAL || "CRITICAL Heat Alert for {location} tomorrow. Extreme heat expected. Stay indoors.";
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
    actionText = "Stay alert and follow local guidance.";
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { success: false, data: null, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json(
        { success: false, data: null, error: "Missing TELEGRAM_BOT_TOKEN" },
        { status: 500 },
      );
    }

    const subscriptions = await getSubscriptions();
    const subscription = subscriptions[0];

    if (!subscription) {
      return NextResponse.json(
        { success: false, data: null, error: "No active subscription found" },
        { status: 404 },
      );
    }

    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const forecastDate = tomorrowDate.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const riskLevel: RiskLevel = "HIGH";
    const riskType: PredictResponse["risk_type"] = "FLOOD";
    const weatherData: WeatherData = {
      rain_current: 18,
      rain_24h_forecast: 62,
      wind_speed: 42,
      wind_gusts: 58,
      temperature: 27,
      humidity: 89,
      pressure: 1001,
      soil_moisture: 0.68,
    };
    const confidence = 92;

    const alertText = `🧪 TEST ALERT — ${buildAlertText(
      riskLevel,
      riskType,
      subscription.location_name,
      forecastDate,
      weatherData,
      confidence,
    )}`;

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

    // await saveAlertLog({
    //   telegram_id: subscription.telegram_id,
    //   risk_level: riskLevel,
    //   risk_type: riskType,
    //   location_name: subscription.location_name,
    //   alert_text: alertText,
    //   was_voice: false,
    // }); // temporarily disabled for testing

    return NextResponse.json({
      success: true,
      data: {
        message: "Test alert sent",
        telegram_id: subscription.telegram_id,
        alert_text: alertText,
      },
      error: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send test alert";
    return NextResponse.json(
      { success: false, data: null, error: message },
      { status: 500 },
    );
  }
}
