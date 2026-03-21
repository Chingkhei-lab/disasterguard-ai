"use client";

import type { WeatherData } from "@/lib/types";

type WeatherPanelProps = {
  weatherData: WeatherData;
};

function formatMetric(value: number, decimals = 1): string {
  return Number.isFinite(value) ? value.toFixed(decimals) : "0.0";
}

export function WeatherPanel({ weatherData }: WeatherPanelProps) {
  const rainDanger = weatherData.rain_current > 50;
  const windDanger = weatherData.wind_speed > 60 || weatherData.wind_gusts > 60;
  const tempDanger = weatherData.temperature > 40;

  const metrics = [
    {
      label: "Rain",
      icon: "🌧",
      value: `${formatMetric(weatherData.rain_current)} mm`,
      danger: rainDanger,
    },
    {
      label: "Wind Speed",
      icon: "💨",
      value: `${formatMetric(weatherData.wind_speed)} km/h`,
      danger: windDanger,
    },
    {
      label: "Wind Gusts",
      icon: "🌀",
      value: `${formatMetric(weatherData.wind_gusts)} km/h`,
      danger: weatherData.wind_gusts > 60,
    },
    {
      label: "Temperature",
      icon: "🌡",
      value: `${formatMetric(weatherData.temperature)} C`,
      danger: tempDanger,
    },
    {
      label: "Humidity",
      icon: "💧",
      value: `${formatMetric(weatherData.humidity)} %`,
      danger: false,
    },
    {
      label: "Pressure",
      icon: "📉",
      value: `${formatMetric(weatherData.pressure)} hPa`,
      danger: false,
    },
    {
      label: "Soil Moisture",
      icon: "🌱",
      value: formatMetric(weatherData.soil_moisture, 2),
      danger: false,
    },
    {
      label: "24h Forecast Rain",
      icon: "☔",
      value: `${formatMetric(weatherData.rain_24h_forecast)} mm`,
      danger: weatherData.rain_24h_forecast > 50,
    },
  ];

  return (
    <section className="rounded-xl border border-[#475569] bg-[#1e293b] p-4">
      <h2 className="mb-3 text-lg font-bold text-white">Weather Now</h2>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-lg bg-slate-800/70 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-300">{metric.label}</p>
            <p className={`mt-1 text-sm font-semibold ${metric.danger ? "text-red-300" : "text-slate-100"}`}>
              <span className="mr-1" aria-hidden="true">
                {metric.icon}
              </span>
              {metric.value}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
