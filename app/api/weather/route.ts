import axios from "axios";
import { NextResponse } from "next/server";

export const revalidate = 1800;

const WEATHER_HOURLY_FIELDS =
  "rain,soil_moisture_0_to_1cm,windspeed_10m,windgusts_10m,temperature_2m,relativehumidity_2m,surface_pressure";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { success: false, data: null, error: "Invalid lat/lng query params" },
        { status: 400 },
      );
    }

    const response = await axios.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude: lat,
        longitude: lng,
        hourly: WEATHER_HOURLY_FIELDS,
        forecast_days: 7,
      },
      timeout: 10_000,
    });

    return NextResponse.json({
      success: true,
      data: {
        hourly: response.data?.hourly ?? null,
      },
      error: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch weather";
    return NextResponse.json(
      { success: false, data: null, error: message },
      { status: 500 },
    );
  }
}
