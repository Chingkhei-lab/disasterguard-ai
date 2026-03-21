import axios from "axios";
import { NextResponse } from "next/server";

import { ALERT_TEMPLATES } from "@/lib/constants";
import type { RiskLevel, RiskType, WeatherData } from "@/lib/types";

type GeminiRequestBody = {
  riskLevel: RiskLevel;
  riskType: RiskType | "LANDSLIDE";
  location: string;
  weatherData: WeatherData;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

const GEMINI_MODEL = "gemini-2.5-flash";

function normalizeLocation(location: string): string {
  return location.trim().length > 0 ? location.trim() : "the selected location";
}

function templateBriefing(riskLevel: RiskLevel, riskType: GeminiRequestBody["riskType"], location: string): string {
  const safeLocation = normalizeLocation(location);

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
  if (riskLevel === "HIGH" && riskType === "HEATWAVE") {
    return ALERT_TEMPLATES.HEATWAVE_HIGH.replace("{location}", safeLocation);
  }

  return ALERT_TEMPLATES.NORMAL.replace("{location}", safeLocation);
}

function isValidBody(body: unknown): body is GeminiRequestBody {
  if (!body || typeof body !== "object") {
    return false;
  }

  const payload = body as Record<string, unknown>;

  return (
    typeof payload.riskLevel === "string" &&
    typeof payload.riskType === "string" &&
    typeof payload.location === "string" &&
    payload.weatherData !== null &&
    typeof payload.weatherData === "object"
  );
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!isValidBody(body)) {
      return NextResponse.json(
        { success: false, data: null, error: "Invalid Gemini request payload" },
        { status: 400 },
      );
    }

    const fallback = templateBriefing(body.riskLevel, body.riskType, body.location);

    if (body.riskLevel === "NORMAL") {
      return NextResponse.json({ success: true, data: { briefing: fallback }, error: null });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ success: true, data: { briefing: fallback }, error: null });
    }

    const prompt = `You are DisasterGuard AI. Generate a 2-sentence emergency briefing for ${normalizeLocation(body.location)}. Risk: ${body.riskLevel} ${body.riskType}. Be specific and actionable. End with one clear instruction.`;

    try {
      const response = await axios.post<GeminiResponse>(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
        },
        {
          timeout: 10_000,
          headers: { "Content-Type": "application/json" },
        },
      );

      const briefing = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return NextResponse.json({
        success: true,
        data: { briefing: briefing && briefing.length > 0 ? briefing : fallback },
        error: null,
      });
    } catch {
      return NextResponse.json({ success: true, data: { briefing: fallback }, error: null });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate briefing";
    return NextResponse.json(
      { success: false, data: null, error: message },
      { status: 500 },
    );
  }
}
