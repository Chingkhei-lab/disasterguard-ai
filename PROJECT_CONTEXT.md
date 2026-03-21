# PROJECT_CONTEXT.md — DisasterGuard AI

## API Reference

### 1. Open-Meteo
- **Base URL:** `https://api.open-meteo.com/v1/forecast`
- **Auth:** None required
- **Key Parameters:**
  - `latitude`, `longitude`
  - `hourly=rain,soil_moisture_0_to_1cm,windspeed_10m,
     windgusts_10m,temperature_2m,relativehumidity_2m,
     surface_pressure`
  - `forecast_days=7`
- **Response shape we care about:**
```json
{
  "hourly": {
    "time": ["2024-01-01T00:00", "..."],
    "rain": [0.0, 1.2, "..."],
    "soil_moisture_0_to_1cm": [0.3, "..."],
    "windspeed_10m": [12.0, "..."],
    "windgusts_10m": [18.0, "..."],
    "temperature_2m": [32.0, "..."],
    "relativehumidity_2m": [85.0, "..."],
    "surface_pressure": [1008.0, "..."]
  }
}
```
- **Cache duration:** 30 minutes minimum

---

### 2. NASA FIRMS (Active Fires)
- **Base URL:** `https://firms.modaps.eosdis.nasa.gov/api/area/csv`
- **Auth:** API key required — `NASA_FIRMS_API_KEY`
- **Key Parameters:**
  - `source=VIIRS_SNPP_NRT`
  - `area=72,8,97,28` (India bounding box)
  - `day_range=1`
  - `date=today`
- **Response:** CSV — parse into array of
  `{ lat, lng, brightness, confidence, acq_date }`
- **Filter:** Only use entries where `confidence > 70`
- **Cache duration:** 60 minutes minimum
- **Daily limit:** 5000 requests — never call without cache check

---

### 3. GDACS (Global Disaster Alerts)
- **Base URL:** `https://www.gdacs.org/xml/rss.xml`
- **Auth:** None required
- **Response:** XML — parse with xml2js into alert objects
- **Fields we use:**
  - `title`, `description`, `pubDate`
  - `geo:lat`, `geo:long`
  - `gdacs:alertlevel` (Green | Orange | Red)
  - `gdacs:eventtype` (EQ | TC | FL | VO | DR | WF)
- **Cache duration:** 60 minutes minimum

---

### 4. Google Gemini
- **Model:** `gemini-2.0-flash`
- **Auth:** `GEMINI_API_KEY`
- **Only used for:**
  - Generating natural language alert text
  - Translating alert to regional language
  - Generating voice script (simplified, short sentences)
- **Never used for:** Risk assessment, data fetching, predictions
- **Rate limit:** 15 req/min — always debounce
- **Fallback:** Pre-written template strings if API fails

---

### 5. Telegram Bot API
- **Base URL:** `https://api.telegram.org/bot{TOKEN}`
- **Auth:** `TELEGRAM_BOT_TOKEN`
- **Endpoints we use:**
  - `sendMessage` — text alerts
  - `sendVoice` — OGG audio alerts
  - `getUpdates` — receive subscription commands
- **Bot commands users can send:**
  - `/subscribe [location]` — subscribe to a location
  - `/unsubscribe` — remove subscription
  - `/status` — get current risk for their location
  - `/language [hindi|english]` — set preference
  - `/voice` — toggle voice alerts on/off

---

### 6. FastAPI ML Service
- **Base URL:** `ML_SERVICE_URL` (Render deployment)
- **Endpoints:**

  **POST `/predict`**
  - Input:
```json
  {
    "rain_current": 12.5,
    "rain_24h_forecast": 85.0,
    "wind_speed": 45.0,
    "wind_gusts": 67.0,
    "temperature": 38.0,
    "humidity": 92.0,
    "pressure": 995.0,
    "soil_moisture": 0.65
  }
```
  - Output:
```json
  {
    "risk_level": "HIGH",
    "risk_type": "FLOOD",
    "confidence": 0.87,
    "fallback_used": false
  }
```
  - `risk_level`: NORMAL | MODERATE | HIGH | CRITICAL
  - `risk_type`: NONE | FLOOD | CYCLONE | HEATWAVE | LANDSLIDE

  **GET `/health`**
  - Returns `{ "status": "ok" }` — used for wake-up ping

- **Cold start handling:** Always ping `/health` first,
  wait for 200 before calling `/predict`
- **Timeout:** 15 seconds for first call (cold start),
  5 seconds after warm

---

## Supabase Schema

### Table: `subscriptions`
```sql
id            uuid primary key default gen_random_uuid()
telegram_id   bigint not null unique
location_name text not null
latitude      float not null
longitude     float not null
language      text default 'hindi'    -- hindi | english
alert_mode    text default 'both'     -- text | voice | both
active        boolean default true
created_at    timestamptz default now()
```

### Table: `alert_logs`
```sql
id             uuid primary key default gen_random_uuid()
telegram_id    bigint not null
risk_level     text not null
risk_type      text not null
location_name  text not null
alert_text     text not null
delivered_at   timestamptz default now()
was_voice      boolean default false
```

### Table: `location_cache`
```sql
id             uuid primary key default gen_random_uuid()
latitude       float not null
longitude      float not null
weather_data   jsonb
risk_result    jsonb
fires_data     jsonb
cached_at      timestamptz default now()
expires_at     timestamptz not null
```

---

## Risk Threshold Reference
These are used as FALLBACK ONLY if ML service is unavailable.
The ML model is the primary decision maker.

| Risk Type | Condition | Level |
|-----------|-----------|-------|
| Cyclone | Wind > 89 km/h | CRITICAL |
| Cyclone | Wind > 62 km/h | HIGH |
| Flood | Rain > 100mm (24h forecast) | CRITICAL |
| Flood | Rain > 50mm AND Soil > 0.4 | HIGH |
| Heatwave | Temp > 45°C | CRITICAL |
| Heatwave | Temp > 40°C | HIGH |
| Landslide | Rain > 80mm AND Soil > 0.6 | HIGH |

---

## Target Regions
Default map view and subscriptions are scoped to:
```typescript
export const TARGET_REGIONS = [
  { name: "Imphal", lat: 24.817, lng: 93.936, state: "Manipur" },
  { name: "Dimapur", lat: 25.909, lng: 93.727, state: "Nagaland" },
  { name: "Guwahati", lat: 26.144, lng: 91.736, state: "Assam" },
  { name: "Shillong", lat: 25.578, lng: 91.893, state: "Meghalaya" },
  { name: "Kohima", lat: 25.670, lng: 94.110, state: "Nagaland" },
  { name: "Silchar", lat: 24.827, lng: 92.797, state: "Assam" },
];

export const MAP_DEFAULT = {
  center: [25.0, 93.0],
  zoom: 7,
};
```

---

## Alert Message Templates
Used as fallback when Gemini API fails.
```typescript
export const ALERT_TEMPLATES = {
  FLOOD_HIGH: "⚠️ Flood Warning for {location}. Heavy rainfall
    expected in next 24hrs. Avoid low-lying areas.",
  FLOOD_CRITICAL: "🔴 CRITICAL Flood Alert for {location}.
    Evacuate low-lying areas immediately.",
  CYCLONE_HIGH: "⚠️ Cyclone Warning for {location}. High winds
    expected. Secure loose structures.",
  CYCLONE_CRITICAL: "🔴 CRITICAL Cyclone Alert for {location}.
    Seek shelter immediately.",
  HEATWAVE_HIGH: "⚠️ Heatwave Warning for {location}. Avoid
    outdoor work between 11am-4pm.",
  NORMAL: "✅ Conditions normal for {location}. No immediate
    threats detected.",
};
```

---

## Deployment Configuration

### Vercel (Frontend)
- Build command: `next build`
- Output directory: `.next`
- Cron job for daily alerts: `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-alerts",
      "schedule": "0 0 * * *"
    }
  ]
}
```
- Daily alert fires at 1:00 AM UTC = 6:30 AM IST

### Render (ML Service)
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port 8000`
- Health check path: `/health`
- Auto-deploy: on push to `main` branch
- Always add wake-up ping from frontend before ML calls