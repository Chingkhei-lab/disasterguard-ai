import axios from "axios";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WEATHER_HOURLY_FIELDS =
  "rain,soil_moisture_0_to_1cm,windspeed_10m,windgusts_10m,temperature_2m,relativehumidity_2m,surface_pressure";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const tomorrow = searchParams.get("tomorrow") === "true";

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

    if (tomorrow) {
      const hourly = response.data?.hourly;
      if (!hourly) {
        throw new Error("Missing hourly data");
      }

      const hours24to48 = (arr: number[]) => (Array.isArray(arr) ? arr.slice(24, 48) : []);

      const rainArr = hours24to48(hourly.rain);
      const windSpeedArr = hours24to48(hourly.windspeed_10m);
      const windGustsArr = hours24to48(hourly.windgusts_10m);
      const tempArr = hours24to48(hourly.temperature_2m);
      const humidityArr = hours24to48(hourly.relativehumidity_2m);
      const pressureArr = hours24to48(hourly.surface_pressure);
      const soilMoistureArr = hours24to48(hourly.soil_moisture_0_to_1cm);

      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const forecast_for = tomorrowDate.toISOString().split("T")[0];

      const safeMax = (arr: number[]) => (arr.length ? Math.max(...arr) : 0);
      const safeMin = (arr: number[]) => (arr.length ? Math.min(...arr) : 0);
      const safeSum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

      const aggregated = {
        rain_current: safeMax(rainArr),
        rain_24h_forecast: safeSum(rainArr),
        wind_speed: safeMax(windSpeedArr),
        wind_gusts: safeMax(windGustsArr),
        temperature: safeMax(tempArr),
        humidity: safeMax(humidityArr),
        pressure: safeMin(pressureArr) || 1000,
        soil_moisture: safeSum(soilMoistureArr) / (soilMoistureArr.length || 1),
        forecast_for,
      };

      return NextResponse.json({
        success: true,
        data: aggregated,
        error: null,
      });
    }

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
