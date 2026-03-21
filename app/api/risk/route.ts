import axios from "axios";
import { NextResponse } from "next/server";

import type { PredictResponse, WeatherData } from "@/lib/types";

function fallbackPredict(input: WeatherData): PredictResponse {
  if (input.wind_speed > 89) {
    return {
      risk_level: "CRITICAL",
      risk_type: "CYCLONE",
      confidence: 0.95,
      fallback_used: true,
    };
  }

  if (input.rain_24h_forecast > 100) {
    return {
      risk_level: "CRITICAL",
      risk_type: "FLOOD",
      confidence: 0.93,
      fallback_used: true,
    };
  }

  if (input.temperature > 45) {
    return {
      risk_level: "CRITICAL",
      risk_type: "HEATWAVE",
      confidence: 0.92,
      fallback_used: true,
    };
  }

  if (input.wind_speed > 62) {
    return {
      risk_level: "HIGH",
      risk_type: "CYCLONE",
      confidence: 0.88,
      fallback_used: true,
    };
  }

  if (input.rain_24h_forecast > 50) {
    return {
      risk_level: "HIGH",
      risk_type: "FLOOD",
      confidence: 0.85,
      fallback_used: true,
    };
  }

  if (input.temperature > 40) {
    return {
      risk_level: "HIGH",
      risk_type: "HEATWAVE",
      confidence: 0.83,
      fallback_used: true,
    };
  }

  if (input.wind_speed > 50) {
    return {
      risk_level: "MODERATE",
      risk_type: "CYCLONE",
      confidence: 0.8,
      fallback_used: true,
    };
  }

  if (input.rain_24h_forecast > 35) {
    return {
      risk_level: "MODERATE",
      risk_type: "FLOOD",
      confidence: 0.78,
      fallback_used: true,
    };
  }

  if (input.temperature > 37) {
    return {
      risk_level: "MODERATE",
      risk_type: "HEATWAVE",
      confidence: 0.76,
      fallback_used: true,
    };
  }

  return {
    risk_level: "NORMAL",
    risk_type: "NONE",
    confidence: 0.75,
    fallback_used: true,
  };
}

function isValidWeatherData(data: unknown): data is WeatherData {
  if (!data || typeof data !== "object") {
    return false;
  }

  const payload = data as Record<string, unknown>;

  return [
    payload.rain_current,
    payload.rain_24h_forecast,
    payload.wind_speed,
    payload.wind_gusts,
    payload.temperature,
    payload.humidity,
    payload.pressure,
    payload.soil_moisture,
  ].every((value) => typeof value === "number" && Number.isFinite(value));
}

export async function POST(request: Request) {
  try {
    const mlServiceUrl = process.env.ML_SERVICE_URL;

    if (!mlServiceUrl) {
      return NextResponse.json(
        { success: false, data: null, error: "Missing ML_SERVICE_URL" },
        { status: 500 },
      );
    }

    const body: unknown = await request.json();
    if (!isValidWeatherData(body)) {
      return NextResponse.json(
        { success: false, data: null, error: "Invalid WeatherData payload" },
        { status: 400 },
      );
    }

    const weatherData = body;

    try {
      await axios.get(`${mlServiceUrl}/health`, { timeout: 15_000 });
    } catch {
      const fallback = fallbackPredict(weatherData);
      return NextResponse.json({ success: true, data: fallback, error: null });
    }

    try {
      const response = await axios.post<PredictResponse>(
        `${mlServiceUrl}/predict`,
        weatherData,
        { timeout: 10_000 },
      );

      const prediction: PredictResponse = {
        risk_level: response.data.risk_level,
        risk_type: response.data.risk_type,
        confidence: response.data.confidence,
        fallback_used: response.data.fallback_used,
      };

      return NextResponse.json({ success: true, data: prediction, error: null });
    } catch {
      const fallback = fallbackPredict(weatherData);
      return NextResponse.json({ success: true, data: fallback, error: null });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get risk prediction";
    return NextResponse.json(
      { success: false, data: null, error: message },
      { status: 500 },
    );
  }
}
