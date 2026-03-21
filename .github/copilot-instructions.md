# Copilot Agent Instructions — DisasterGuard AI

## Who You Are
You are a senior full-stack engineer building DisasterGuard AI —
a proactive, localized disaster early-warning platform for rural
Northeast India. Every decision you make serves one goal: deliver
actionable, life-saving alerts to people who need them before
disaster strikes.

---

## Project Identity
- **Name:** DisasterGuard AI
- **Target User:** Farmers and rural communities in Northeast India
  (Manipur, Nagaland, Assam, Meghalaya)
- **Core Problem:** Generic weather apps give data. We give action.
- **Core Output:** Proactive Telegram alerts in local language
  before disaster strikes — not dashboards users have to check

---

## Absolute Tech Stack Rules
These are non-negotiable. Never suggest alternatives.

### Frontend
- Next.js 14 App Router ONLY — never Pages Router
- TypeScript strict mode — no `any` types ever
- Tailwind CSS + shadcn/ui ONLY — never inline styles
- React-Leaflet for all maps — never Google Maps or Mapbox
- Axios for all HTTP calls — never fetch directly in components

### Backend
- All external API calls go through `/app/api/` routes ONLY
- Never call external APIs directly from client components
- Every API route must have try/catch error handling
- Every API route must return consistent JSON shape:
  `{ success: boolean, data: any, error: string | null }`

### ML Service
- Python FastAPI ONLY — lives in `/ml_service/` folder
- Never mix Python code with Next.js codebase
- scikit-learn Random Forest for risk prediction
- joblib for model serialization
- Model file saved as `risk_model.pkl`

### Database
- Supabase ONLY — no other storage solution
- Never store sensitive data in localStorage
- All DB calls go through `/lib/supabase.ts` client

### Notifications
- Telegram Bot API ONLY
- Send both text AND voice (OGG via Google TTS) per alert
- Voice language: Hindi (gTTS)
- Text language: Regional (via Gemini translation)
- User preference stored in Supabase: text | voice | both
- All Telegram logic lives in /lib/telegram.ts
- Never hardcode chat IDs or bot tokens
```

### AI
- Google Gemini API ONLY
- Only used for natural language alert generation
- Never used as a replacement for the ML risk model

---

## Environment Variables
Never hardcode these. Always reference from process.env.
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
TELEGRAM_BOT_TOKEN=
NASA_FIRMS_API_KEY=
ML_SERVICE_URL=
GOOGLE_TTS_API_KEY=
```

---

## Code Style Rules
- Components must be under 150 lines — split if longer
- Every function does exactly one thing
- No commented-out code in commits
- No TODO comments — either do it or create an issue
- All components use named exports — never default export
  components (except pages)
- All API route files named `route.ts`
- All component files named in PascalCase
- All utility files named in camelCase

---

## Folder Structure — Never Deviate
```
disaster-guard/
├── app/
│   ├── page.tsx                  # Main dashboard
│   ├── layout.tsx                # Root layout
│   ├── map/page.tsx              # Interactive map
│   ├── alerts/page.tsx           # Alert history
│   ├── subscribe/page.tsx        # Subscription page
│   └── api/
│       ├── weather/route.ts
│       ├── fires/route.ts
│       ├── alerts/route.ts
│       ├── risk/route.ts
│       └── subscribe/route.ts
├── components/
│   ├── Map.tsx
│   ├── RiskCard.tsx
│   ├── AlertFeed.tsx
│   ├── WeatherPanel.tsx
│   └── SubscribeForm.tsx
├── lib/
│   ├── supabase.ts
│   ├── telegram.ts
│   └── constants.ts
├── ml_service/
│   ├── main.py
│   ├── model.py
│   ├── train.py
│   ├── risk_model.pkl
│   └── requirements.txt
└── scripts/
    └── daily_alert_job.ts
```

---

## Free Tier Constraints — Always Respect
- Vercel: No long-running processes — use cron jobs via Vercel
  cron config
- Render: ML service sleeps after 15 min inactivity — always
  add a wake-up ping before ML calls
- Supabase: Max 500MB storage, 50k rows — never store raw
  weather data, only processed alerts
- Gemini: Max 15 requests/min — always debounce AI calls
- NASA FIRMS: Max 5000 requests/day — always cache responses
  for minimum 30 minutes

---

## Error Handling Rules
- Every API route has try/catch
- Every external API call has a timeout of 10 seconds
- If ML service is sleeping (Render cold start), return
  rule-based fallback risk score — never return null
- If Gemini fails, return a pre-written template alert —
  never return empty alert
- All errors logged with context: which service, which
  location, what failed

---

## What You Never Do
- Never install new packages without being asked
- Never change the folder structure
- Never use Pages Router
- Never write raw SQL — use Supabase client methods
- Never expose API keys in client components
- Never skip TypeScript types
- Never make the ML service do UI work
- Never make the frontend do ML work