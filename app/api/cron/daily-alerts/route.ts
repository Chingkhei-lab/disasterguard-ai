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

function buildAlertText(riskLevel: RiskLevel, riskType: PredictResponse["risk_type"], location: string, date: string): string {
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

  return `⚠️ DisasterGuard AI\nTomorrow (${date}) forecast for ${safeLocation}:\nRisk: ${riskLevel} ${riskType}\n${actionText}\nStay safe.`;
}

async function processSubscription(
  origin: string,
  token: string,
  subscription: Subscription,
): Promise<boolean> {
  const weatherRes = await fetch(
    `${origin}/api/weather?lat=${subscription.latitude}&lng=${subscription.longitude}&tomorrow=true`,
    { method: "GET", cache: "no-store" },
  );

  if (!weatherRes.ok) {
    throw new Error(`Weather fetch failed for ${subscription.location_name}`);
  }

  const weatherPayload = (await weatherRes.json()) as ApiResponse<WeatherData & { forecast_for: string }>;
  const weatherData = weatherPayload.data;

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

  const alertText = buildAlertText(result.risk_level, result.risk_type, subscription.location_name, weatherData.forecast_for);

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
