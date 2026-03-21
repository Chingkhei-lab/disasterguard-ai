export type RiskLevel = "NORMAL" | "MODERATE" | "HIGH" | "CRITICAL";

export type RiskType = "NONE" | "FLOOD" | "CYCLONE" | "HEATWAVE";

export interface WeatherData {
  rain_current: number;
  rain_24h_forecast: number;
  wind_speed: number;
  wind_gusts: number;
  temperature: number;
  humidity: number;
  pressure: number;
  soil_moisture: number;
}

export interface PredictResponse {
  risk_level: RiskLevel;
  risk_type: RiskType | "LANDSLIDE";
  confidence: number;
  fallback_used: boolean;
}

export interface AlertLog {
  id: string;
  telegram_id: number;
  risk_level: RiskLevel;
  risk_type: RiskType | "LANDSLIDE";
  location_name: string;
  alert_text: string;
  delivered_at: string;
  was_voice: boolean;
}

export interface Subscription {
  id: string;
  telegram_id: number;
  location_name: string;
  latitude: number;
  longitude: number;
  language: "hindi" | "english";
  alert_mode: "text" | "voice" | "both";
  active: boolean;
  created_at: string;
}

export interface RegionStatus {
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  latest_risk: PredictResponse;
}
