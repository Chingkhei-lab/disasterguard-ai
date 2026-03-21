import axios from "axios";
import { NextResponse } from "next/server";

import { saveSubscription } from "@/lib/supabase";

type SubscribeBody = {
  telegramId: number;
  locationName: string;
  latitude: number;
  longitude: number;
  language: string;
  alertMode: string;
};

function isValidBody(body: unknown): body is SubscribeBody {
  if (!body || typeof body !== "object") {
    return false;
  }

  const payload = body as Record<string, unknown>;

  return (
    typeof payload.telegramId === "number" &&
    Number.isFinite(payload.telegramId) &&
    typeof payload.locationName === "string" &&
    payload.locationName.length > 0 &&
    typeof payload.latitude === "number" &&
    Number.isFinite(payload.latitude) &&
    typeof payload.longitude === "number" &&
    Number.isFinite(payload.longitude) &&
    typeof payload.language === "string" &&
    payload.language.length > 0 &&
    typeof payload.alertMode === "string" &&
    payload.alertMode.length > 0
  );
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!isValidBody(body)) {
      return NextResponse.json(
        { success: false, data: null, error: "Invalid subscription payload" },
        { status: 400 },
      );
    }

    await saveSubscription({
      telegram_id: body.telegramId,
      location_name: body.locationName,
      latitude: body.latitude,
      longitude: body.longitude,
      language: body.language === "english" ? "english" : "hindi",
      alert_mode:
        body.alertMode === "text" || body.alertMode === "voice" || body.alertMode === "both"
          ? body.alertMode
          : "both",
      active: true,
    });

    const message = `✅ DisasterGuard AI: Subscribed to alerts for ${body.locationName}. Morning alerts at 6:30 AM IST.`;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return NextResponse.json({
        success: true,
        data: { message: "Subscribed successfully. Bot message pending." },
        error: null,
      });
    }

    try {
      await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: body.telegramId,
          text: message,
        },
        {
          timeout: 10_000,
        },
      );
    } catch (telegramErr) {
      if (axios.isAxiosError(telegramErr)) {
        console.error("Telegram error:", telegramErr.response?.data);
      }

      return NextResponse.json({
        success: true,
        data: { message: "Subscribed successfully. Bot message pending." },
        error: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: { message: "Subscribed successfully" },
      message: "Subscribed successfully",
      error: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to subscribe";
    return NextResponse.json(
      { success: false, data: null, error: message },
      { status: 500 },
    );
  }
}
