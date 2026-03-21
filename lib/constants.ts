export const TARGET_REGIONS = [
  { name: "Imphal", lat: 24.817, lng: 93.936, state: "Manipur" },
  { name: "Dimapur", lat: 25.909, lng: 93.727, state: "Nagaland" },
  { name: "Guwahati", lat: 26.144, lng: 91.736, state: "Assam" },
  { name: "Shillong", lat: 25.578, lng: 91.893, state: "Meghalaya" },
  { name: "Kohima", lat: 25.67, lng: 94.11, state: "Nagaland" },
  { name: "Silchar", lat: 24.827, lng: 92.797, state: "Assam" },
] as const;

export const MAP_DEFAULT = {
  center: [25.0, 93.0] as const,
  zoom: 7,
} as const;

export const COLORS = {
  NORMAL: { bg: "#16a34a", text: "#ffffff", badge: "#dcfce7" },
  MODERATE: { bg: "#d97706", text: "#ffffff", badge: "#fef3c7" },
  HIGH: { bg: "#ea580c", text: "#ffffff", badge: "#ffedd5" },
  CRITICAL: { bg: "#dc2626", text: "#ffffff", badge: "#fee2e2" },
  background: "#0f172a",
  surface: "#1e293b",
  surfaceLight: "#334155",
  border: "#475569",
  textPrimary: "#f1f5f9",
  textMuted: "#94a3b8",
  accent: "#3b82f6",
} as const;

export const ALERT_TEMPLATES = {
  FLOOD_HIGH:
    "⚠️ Flood Warning for {location}. Heavy rainfall expected in next 24hrs. Avoid low-lying areas.",
  FLOOD_CRITICAL:
    "🔴 CRITICAL Flood Alert for {location}. Evacuate low-lying areas immediately.",
  CYCLONE_HIGH:
    "⚠️ Cyclone Warning for {location}. High winds expected. Secure loose structures.",
  CYCLONE_CRITICAL:
    "🔴 CRITICAL Cyclone Alert for {location}. Seek shelter immediately.",
  HEATWAVE_HIGH:
    "⚠️ Heatwave Warning for {location}. Avoid outdoor work between 11am-4pm.",
  NORMAL: "✅ Conditions normal for {location}. No immediate threats detected.",
} as const;

export type RISK_LEVELS = "NORMAL" | "MODERATE" | "HIGH" | "CRITICAL";

export const SUBSCRIBE_LOCATIONS = [
  { name: "Imphal", state: "Manipur", lat: 24.817, lng: 93.936 },
  { name: "Churachandpur", state: "Manipur", lat: 24.333, lng: 93.683 },
  { name: "Bishnupur", state: "Manipur", lat: 24.617, lng: 93.767 },
  { name: "Thoubal", state: "Manipur", lat: 24.633, lng: 93.983 },
  { name: "Senapati", state: "Manipur", lat: 25.267, lng: 94.017 },
  { name: "Dimapur", state: "Nagaland", lat: 25.909, lng: 93.727 },
  { name: "Kohima", state: "Nagaland", lat: 25.67, lng: 94.11 },
  { name: "Mokokchung", state: "Nagaland", lat: 26.324, lng: 94.507 },
  { name: "Wokha", state: "Nagaland", lat: 26.1, lng: 94.267 },
  { name: "Guwahati", state: "Assam", lat: 26.144, lng: 91.736 },
  { name: "Silchar", state: "Assam", lat: 24.827, lng: 92.797 },
  { name: "Dibrugarh", state: "Assam", lat: 27.48, lng: 94.912 },
  { name: "Jorhat", state: "Assam", lat: 26.75, lng: 94.203 },
  { name: "Tezpur", state: "Assam", lat: 26.633, lng: 92.8 },
  { name: "Shillong", state: "Meghalaya", lat: 25.578, lng: 91.893 },
  { name: "Tura", state: "Meghalaya", lat: 25.514, lng: 90.213 },
  { name: "Aizawl", state: "Mizoram", lat: 23.727, lng: 92.717 },
  { name: "Lunglei", state: "Mizoram", lat: 22.883, lng: 92.733 },
  { name: "Agartala", state: "Tripura", lat: 23.831, lng: 91.286 },
  { name: "Itanagar", state: "Arunachal Pradesh", lat: 27.084, lng: 93.606 },
] as const;

