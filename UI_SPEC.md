# UI_SPEC.md — DisasterGuard AI

## Design Philosophy
This is not a data dashboard. It is an emergency intelligence
platform. Every design decision must reflect urgency, clarity,
and trust. A farmer's relative in a city checking this app
must understand the risk level in under 3 seconds.

---

## Color System

### Base Palette
```typescript
// constants.ts — add these
export const COLORS = {
  // Risk levels — must be consistent everywhere
  NORMAL:   { bg: "#16a34a", text: "#ffffff", badge: "#dcfce7" },
  MODERATE: { bg: "#d97706", text: "#ffffff", badge: "#fef3c7" },
  HIGH:     { bg: "#ea580c", text: "#ffffff", badge: "#ffedd5" },
  CRITICAL: { bg: "#dc2626", text: "#ffffff", badge: "#fee2e2" },

  // UI base
  background:   "#0f172a",  // dark navy
  surface:      "#1e293b",  // card background
  surfaceLight: "#334155",  // hover states
  border:       "#475569",  // subtle borders
  textPrimary:  "#f1f5f9",  // main text
  textMuted:    "#94a3b8",  // secondary text
  accent:       "#3b82f6",  // blue — interactive elements
}
```

---

## Typography
```css
/* globals.css */
font-family: 'Inter', sans-serif;

/* Scale */
--text-xs:   0.75rem;   /* 12px — labels, badges */
--text-sm:   0.875rem;  /* 14px — secondary info */
--text-base: 1rem;      /* 16px — body text */
--text-lg:   1.125rem;  /* 18px — card titles */
--text-xl:   1.25rem;   /* 20px — section headers */
--text-2xl:  1.5rem;    /* 24px — page titles */
--text-4xl:  2.25rem;   /* 36px — risk level display */
```

---

## Pages

### Page 1 — `/` Main Dashboard
**Purpose:** At-a-glance overview of all target regions

**Layout:**
```
┌─────────────────────────────────────────┐
│  NAVBAR                                 │
│  DisasterGuard AI    [Map] [Alerts]     │
│                      [Subscribe]        │
├─────────────────────────────────────────┤
│  HERO STRIP                             │
│  Last updated: 6:30 AM IST             │
│  Overall status: [MODERATE WARNING]     │
├──────────────┬──────────────────────────┤
│  REGION GRID │  ALERT FEED             │
│              │                         │
│  [Imphal  ]  │  ⚠ Flood Warning        │
│  HIGH FLOOD  │  Imphal — 2 hrs ago     │
│              │                         │
│  [Dimapur ]  │  ✅ Normal              │
│  NORMAL      │  Dimapur — 2 hrs ago    │
│              │                         │
│  [Guwahati]  │  🔴 Critical            │
│  CRITICAL    │  Guwahati — 1 hr ago    │
│              │                         │
│  [Shillong]  │                         │
│  MODERATE    │                         │
│              │                         │
│  [Kohima  ]  │                         │
│  NORMAL      │                         │
│              │                         │
│  [Silchar ]  │                         │
│  HIGH        │                         │
├──────────────┴──────────────────────────┤
│  FOOTER                                 │
│  Data: Open-Meteo | NASA FIRMS | GDACS  │
└─────────────────────────────────────────┘
```

**Behavior:**
- Region cards auto-refresh every 10 minutes
- Clicking a region card navigates to `/map?location=imphal`
- CRITICAL cards pulse with CSS animation
- Alert feed shows last 10 alerts from Supabase

---

### Page 2 — `/map`
**Purpose:** Interactive detailed analysis for any location

**Layout:**
```
┌─────────────────────────────────────────┐
│  NAVBAR                                 │
├─────────────────────────────────────────┤
│  SEARCH BAR                             │
│  [Search any location in NE India...  ] │
├───────────────────────┬─────────────────┤
│                       │ ANALYSIS PANEL  │
│                       │                 │
│   LEAFLET MAP         │ Location:       │
│                       │ Imphal, Manipur │
│   🔴 fire markers     │                 │
│   ⚠ disaster markers  │ Risk Level:     │
│   📍 click to analyze │ [HIGH FLOOD]    │
│                       │ Confidence: 87% │
│                       │                 │
│                       │ Weather Now:    │
│                       │ 🌧 Rain: 45mm   │
│                       │ 💨 Wind: 38km/h │
│                       │ 🌡 Temp: 28°C   │
│                       │ 💧 Humidity:92% │
│                       │                 │
│                       │ AI Briefing:    │
│                       │ "Heavy rainfall │
│                       │  expected..."   │
│                       │                 │
│                       │ [🔔 Subscribe] │
├───────────────────────┴─────────────────┤
│  7-DAY FORECAST STRIP                   │
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun      │
│  🌧    🌧    ⛅   ☀    ☀    🌦   🌧     │
└─────────────────────────────────────────┘
```

**Behavior:**
- Click anywhere on map → fetch weather → call ML → show panel
- Fire markers loaded from NASA FIRMS on page load
- Disaster markers loaded from GDACS on page load
- Search bar uses Nominatim geocoding
- Analysis panel slides in from right on mobile
- Subscribe button pre-fills location in subscribe form

---

### Page 3 — `/alerts`
**Purpose:** Full alert history log

**Layout:**
```
┌─────────────────────────────────────────┐
│  NAVBAR                                 │
├─────────────────────────────────────────┤
│  FILTERS                                │
│  [All Regions ▼] [All Types ▼] [Date ▼]│
├─────────────────────────────────────────┤
│  ALERT TABLE                            │
│                                         │
│  Time     Location   Risk    Type       │
│  ───────────────────────────────────    │
│  6:30AM   Imphal     HIGH    FLOOD      │
│  6:30AM   Guwahati   CRIT    CYCLONE    │
│  6:30AM   Silchar    MOD     FLOOD      │
│  ...                                    │
│                                         │
│  [Load more]                            │
└─────────────────────────────────────────┘
```

**Behavior:**
- Paginated — 20 rows per page
- Filter by region, risk type, date range
- Each row expandable to show full AI briefing text
- Export to CSV button (judges love this)

---

### Page 4 — `/subscribe`
**Purpose:** Users subscribe their Telegram for alerts

**Layout:**
```
┌─────────────────────────────────────────┐
│  NAVBAR                                 │
├─────────────────────────────────────────┤
│                                         │
│  Get Early Warning Alerts               │
│  Delivered to your Telegram             │
│                                         │
│  Step 1: Open Telegram                  │
│  Search @DisasterGuardBot               │
│  Send /start to get your Chat ID        │
│                                         │
│  Step 2: Fill this form                 │
│  ┌──────────────────────────────┐       │
│  │ Your Telegram Chat ID        │       │
│  └──────────────────────────────┘       │
│  ┌──────────────────────────────┐       │
│  │ Your Location (city name)    │       │
│  └──────────────────────────────┘       │
│  ┌──────────────────────────────┐       │
│  │ Alert Language  [Hindi ▼]    │       │
│  └──────────────────────────────┘       │
│  ┌──────────────────────────────┐       │
│  │ Alert Mode [Both ▼]          │       │
│  │ Text | Voice | Both          │       │
│  └──────────────────────────────┘       │
│                                         │
│  [Subscribe Now]                        │
│                                         │
│  ✅ You'll receive a test alert         │
│     immediately after subscribing       │
│                                         │
└─────────────────────────────────────────┘
```

**Behavior:**
- On submit: write to Supabase subscriptions table
- Immediately send a test Telegram message/voice
- Show success state with "Test alert sent" confirmation
- Location field uses Nominatim to resolve to lat/lng

---

## Components

### `Navbar.tsx`
```
- Logo left: shield icon + "DisasterGuard AI"
- Links right: Map, Alerts, Subscribe
- Mobile: hamburger menu
- Active link highlighted with accent color
- Sticky top — always visible
```

### `RiskCard.tsx`
Props:
```typescript
{
  location: string
  riskLevel: "NORMAL" | "MODERATE" | "HIGH" | "CRITICAL"
  riskType: string
  confidence: number
  lastUpdated: string
  onClick: () => void
}
```
Behavior:
- Background color changes based on riskLevel
- CRITICAL cards have pulsing border animation
- Shows confidence as a small percentage badge
- Clicking navigates to map with location pre-selected

### `Map.tsx`
```
- Default center: [25.0, 93.0] zoom 7
- TileLayer: OpenStreetMap (free, no API key)
- FireMarker: red flame icon, tooltip shows confidence
- DisasterMarker: warning icon, tooltip shows alert level
- ClickMarker: blue pin where user clicked
- No Google Maps, no Mapbox — ever
```

### `AlertFeed.tsx`
```
- Scrollable list of last 10 alerts
- Each item: icon + location + risk + time ago
- Auto-refreshes every 5 minutes
- Skeleton loading state while fetching
- Empty state: "No alerts in the last 24 hours"
```

### `WeatherPanel.tsx`
```
- Shows 8 weather metrics in a 2x4 grid
- Each metric: icon + value + unit
- Color codes values near dangerous thresholds
- Skeleton loading state
```

### `SubscribeForm.tsx`
```
- 4 inputs: chatId, location, language, alertMode
- Client-side validation before submit
- Loading state on submit button
- Success state shows test alert confirmation
- Error state shows specific error message
```

---

## Mobile Responsiveness Rules
- All layouts stack vertically on screens below 768px
- Map takes full screen width on mobile
- Analysis panel becomes a bottom sheet on mobile
- Region grid becomes single column on mobile
- Minimum tap target size: 44px x 44px
- Font never below 14px on mobile

---

## Loading States
Every data-fetching component must have three states:
```
1. Loading  — skeleton placeholder, never blank screen
2. Success  — actual data
3. Error    — specific message + retry button
```

Never show a spinner alone. Always use skeleton UI
that matches the shape of the actual content.

---

## CRITICAL Animation Rules
```css
/* CRITICAL risk level pulse */
@keyframes criticalPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
  50%       { box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); }
}

.critical-card {
  animation: criticalPulse 2s infinite;
}
```
Only CRITICAL cards animate. HIGH and below are static.
Animations stop if user has prefers-reduced-motion enabled.

---

## What The Demo Must Show
In exactly this order for maximum judge impact:

1. Open dashboard — judges see all 6 regions with risk levels
2. Click Imphal card — map opens, analysis panel loads
3. AI briefing generates in real time — visible streaming
4. Switch to Subscribe page — fill form live
5. Show Telegram phone — test alert arrives as text
6. Show voice alert arriving 3 seconds later
7. Switch to Alerts page — show history table
8. Open /model-info endpoint in browser —
   proves real ML not just API wrapper

That last step is what separates you from every other team.