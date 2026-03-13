import requests
import pandas as pd
import time

LOCATIONS = [
    {"name": "Imphal",   "lat": 24.817, "lng": 93.936},
    {"name": "Dimapur",  "lat": 25.909, "lng": 93.727},
    {"name": "Guwahati", "lat": 26.144, "lng": 91.736},
    {"name": "Shillong", "lat": 25.578, "lng": 91.893},
    {"name": "Kohima",   "lat": 25.670, "lng": 94.110},
    {"name": "Silchar",  "lat": 24.827, "lng": 92.797},
]

def fetch_location(name, lat, lng):
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat,
        "longitude": lng,
        "start_date": "2022-01-01",
        "end_date": "2024-01-01",
        "hourly": ",".join([
            "rain",
            "windspeed_10m",
            "windgusts_10m",
            "temperature_2m",
            "relativehumidity_2m",
            "surface_pressure"
        ])
    }

    print(f"Fetching {name}...")
    response = requests.get(url, params=params, timeout=30)
    data = response.json()["hourly"]

    df = pd.DataFrame(data)
    df.columns = [
        "time", "rain_current",
        "wind_speed", "wind_gusts", "temperature",
        "humidity", "pressure"
    ]
    df["location"] = name
    df["lat"] = lat
    df["lng"] = lng
    return df

all_data = []
for loc in LOCATIONS:
    df = fetch_location(loc["name"], loc["lat"], loc["lng"])
    all_data.append(df)
    time.sleep(2)  # be polite to the API

combined = pd.concat(all_data, ignore_index=True)
combined.to_csv("raw_data.csv", index=False)
print(f"Done. Total rows: {len(combined)}")