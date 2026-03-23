import requests
import pandas as pd
import time
from datetime import datetime, timedelta

# ── Real disaster events from historical research ──────────
# Format: (city, lat, lng, date_str, risk_level, risk_type)
EVENTS = [
    # GUWAHATI — FLOODS
    ("Guwahati", 26.144, 91.736, "2010-07-15", "CRITICAL", "FLOOD"),
    ("Guwahati", 26.144, 91.736, "2012-06-24", "CRITICAL", "FLOOD"),
    ("Guwahati", 26.144, 91.736, "2012-09-19", "HIGH",     "FLOOD"),
    ("Guwahati", 26.144, 91.736, "2013-05-17", "HIGH",     "FLOOD"),
    ("Guwahati", 26.144, 91.736, "2013-06-15", "HIGH",     "FLOOD"),
    ("Guwahati", 26.144, 91.736, "2014-07-24", "HIGH",     "FLOOD"),
    ("Guwahati", 26.144, 91.736, "2015-08-01", "HIGH",     "FLOOD"),
    ("Guwahati", 26.144, 91.736, "2019-05-04", "MODERATE", "CYCLONE"),
    ("Guwahati", 26.144, 91.736, "2019-07-10", "CRITICAL", "FLOOD"),
    ("Guwahati", 26.144, 91.736, "2019-08-01", "HIGH",     "FLOOD"),
    ("Guwahati", 26.144, 91.736, "2019-09-01", "MODERATE", "CYCLONE"),
    ("Guwahati", 26.144, 91.736, "2020-10-01", "HIGH",     "FLOOD"),
    ("Guwahati", 26.144, 91.736, "2024-05-30", "CRITICAL", "FLOOD"),
    # GUWAHATI — HEATWAVE
    ("Guwahati", 26.144, 91.736, "2024-05-25", "CRITICAL", "HEATWAVE"),
    ("Guwahati", 26.144, 91.736, "2024-09-23", "CRITICAL", "HEATWAVE"),
    ("Guwahati", 26.144, 91.736, "2025-06-04", "HIGH",     "FLOOD"),
    ("Guwahati", 26.144, 91.736, "2025-06-10", "HIGH",     "HEATWAVE"),

    # IMPHAL — FLOODS
    ("Imphal", 24.817, 93.936, "2015-08-06", "CRITICAL", "FLOOD"),
    ("Imphal", 24.817, 93.936, "2016-05-25", "HIGH",     "FLOOD"),
    ("Imphal", 24.817, 93.936, "2017-04-15", "MODERATE", "FLOOD"),
    ("Imphal", 24.817, 93.936, "2017-07-11", "CRITICAL", "FLOOD"),
    ("Imphal", 24.817, 93.936, "2018-06-15", "CRITICAL", "FLOOD"),
    ("Imphal", 24.817, 93.936, "2019-10-25", "HIGH",     "FLOOD"),
    ("Imphal", 24.817, 93.936, "2022-07-01", "HIGH",     "FLOOD"),
    ("Imphal", 24.817, 93.936, "2024-05-25", "CRITICAL", "FLOOD"),
    ("Imphal", 24.817, 93.936, "2024-07-04", "HIGH",     "FLOOD"),
    ("Imphal", 24.817, 93.936, "2024-08-01", "HIGH",     "FLOOD"),
    ("Imphal", 24.817, 93.936, "2025-06-01", "HIGH",     "FLOOD"),
    ("Imphal", 24.817, 93.936, "2025-06-04", "CRITICAL", "FLOOD"),

    # SHILLONG — STORMS
    ("Shillong", 25.578, 91.893, "2010-04-12", "CRITICAL", "CYCLONE"),
    ("Shillong", 25.578, 91.893, "2013-04-11", "HIGH",     "CYCLONE"),
    ("Shillong", 25.578, 91.893, "2021-12-22", "MODERATE", "CYCLONE"),
    ("Shillong", 25.578, 91.893, "2024-03-31", "MODERATE", "CYCLONE"),
    ("Shillong", 25.578, 91.893, "2024-05-28", "HIGH",     "FLOOD"),
    ("Shillong", 25.578, 91.893, "2024-09-23", "HIGH",     "HEATWAVE"),

    # AGARTALA — FLOODS AND STORMS
    ("Agartala", 23.831, 91.286, "2003-08-05", "HIGH",     "FLOOD"),
    ("Agartala", 23.831, 91.286, "2004-06-25", "HIGH",     "FLOOD"),
    ("Agartala", 23.831, 91.286, "2019-11-09", "HIGH",     "CYCLONE"),
    ("Agartala", 23.831, 91.286, "2024-08-21", "CRITICAL", "FLOOD"),
    ("Agartala", 23.831, 91.286, "2024-09-19", "HIGH",     "HEATWAVE"),
    ("Agartala", 23.831, 91.286, "2024-09-01", "CRITICAL", "FLOOD"),
    ("Agartala", 23.831, 91.286, "2025-04-07", "MODERATE", "CYCLONE"),
    ("Agartala", 23.831, 91.286, "2025-04-21", "MODERATE", "CYCLONE"),

    # AIZAWL — LANDSLIDES AND FLOODS
    # Note: landslide mapped to FLOOD since conditions identical
    ("Aizawl", 23.727, 92.717, "2013-05-11", "CRITICAL", "FLOOD"),
    ("Aizawl", 23.727, 92.717, "2017-06-12", "HIGH",     "FLOOD"),
    ("Aizawl", 23.727, 92.717, "2019-07-03", "HIGH",     "FLOOD"),
    ("Aizawl", 23.727, 92.717, "2019-07-08", "HIGH",     "FLOOD"),
    ("Aizawl", 23.727, 92.717, "2023-10-24", "MODERATE", "CYCLONE"),
    ("Aizawl", 23.727, 92.717, "2024-05-28", "CRITICAL", "FLOOD"),
    ("Aizawl", 23.727, 92.717, "2025-06-03", "CRITICAL", "FLOOD"),

    # DIMAPUR — FLOODS AND STORMS
    ("Dimapur", 25.909, 93.727, "2008-09-11", "CRITICAL", "FLOOD"),
    ("Dimapur", 25.909, 93.727, "2023-04-16", "HIGH",     "CYCLONE"),
    ("Dimapur", 25.909, 93.727, "2023-06-11", "HIGH",     "FLOOD"),

    # KOHIMA — STORMS AND FLOODS
    ("Kohima", 25.670, 94.110, "2009-03-15", "MODERATE", "CYCLONE"),
    ("Kohima", 25.670, 94.110, "2023-04-26", "MODERATE", "CYCLONE"),
    ("Kohima", 25.670, 94.110, "2023-05-06", "MODERATE", "CYCLONE"),
    ("Kohima", 25.670, 94.110, "2024-04-11", "HIGH",     "CYCLONE"),
]

def fetch_pre_event_weather(city, lat, lng, event_date_str, days_before=3):
    """
    Fetch hourly weather for N days BEFORE the event.
    This is the weather pattern that PRECEDES disaster —
    exactly what the model needs to learn.
    """
    event_date = datetime.strptime(event_date_str, "%Y-%m-%d")
    start_date = event_date - timedelta(days=days_before)
    end_date   = event_date - timedelta(days=1)

    # Skip future dates
    if start_date > datetime.now():
        print(f"  Skipping {event_date_str} \u2014 future date")
        return None

    # Open-Meteo archive
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude":   lat,
        "longitude":  lng,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date":   end_date.strftime("%Y-%m-%d"),
        "hourly": ",".join([
            "rain",
            "windspeed_10m",
            "windgusts_10m",
            "temperature_2m",
            "relativehumidity_2m",
            "surface_pressure"
        ])
    }

    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()["hourly"]

        df = pd.DataFrame(data)
        df.columns = [
            "time", "rain_current", "wind_speed",
            "wind_gusts", "temperature", "humidity", "pressure"
        ]
        df["location"] = city
        df["lat"]      = lat
        df["lng"]      = lng

        # Generate soil_moisture synthetically
        df["soil_moisture"] = (
            (df["rain_current"].clip(0, 100) / 100) * 0.6 +
            (df["humidity"] / 100) * 0.4
        ).clip(0, 1)

        # Generate rain_24h_forecast as rolling sum
        df = df.sort_values("time").reset_index(drop=True)
        # Using ffill on shift result to handle the fillna correctly
        df["rain_24h_forecast"] = (
            df["rain_current"]
            .rolling(24, min_periods=1)
            .sum()
            .shift(-24)
            .ffill()
        )

        return df

    except Exception as e:
        print(f"  Error fetching {city} {event_date_str}: {e}")
        return None

def main():
    print("Collecting pre-event weather data for real disaster events...")
    print(f"Total events to process: {len(EVENTS)}\n")

    all_frames = []
    success    = 0
    failed     = 0

    for i, (city, lat, lng, date_str, risk_level, risk_type) in enumerate(EVENTS):
        print(f"[{i+1}/{len(EVENTS)}] {city} \u2014 {date_str} \u2014 {risk_level} {risk_type}")

        df = fetch_pre_event_weather(city, lat, lng, date_str, days_before=3)

        if df is not None and len(df) > 0:
            df["risk_level"]     = risk_level
            df["risk_type"]      = risk_type
            df["combined_label"] = risk_level + "_" + risk_type
            df["is_real_event"]  = True
            all_frames.append(df)
            success += 1
            print(f"  \u2713 {len(df)} hourly rows collected")
        else:
            failed += 1
            print(f"  \u2717 Failed or skipped")

        # Be polite to the API
        time.sleep(1.5)

    if not all_frames:
        print("\nNo data collected. Check your internet connection.")
        return

    combined = pd.concat(all_frames, ignore_index=True)
    combined  = combined.dropna()

    print(f"\n{'='*50}")
    print(f"Collection complete:")
    print(f"  Successful events:  {success}")
    print(f"  Failed/skipped:     {failed}")
    print(f"  Total hourly rows:  {len(combined)}")
    print(f"\nLabel distribution:")
    print(combined["risk_level"].value_counts())
    print(f"\nRisk type distribution:")
    print(combined["risk_type"].value_counts())

    combined.to_csv("real_event_data.csv", index=False)
    print(f"\nSaved to real_event_data.csv")
    print("Run retrain.py next.")

if __name__ == "__main__":
    main()
