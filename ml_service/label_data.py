import pandas as pd
import numpy as np

df = pd.read_csv("clean_data.csv")

# ── Absolute floor thresholds ──────────────────────────────
# Below these values a condition is NEVER dangerous
# These are meteorologically grounded minimums
FLOORS = {
    "wind_cyclone_moderate": 25,    # km/h — below this, no cyclone label
    "wind_cyclone_high":     45,    # km/h
    "wind_cyclone_critical": 65,    # km/h
    "rain_flood_moderate":   8,     # mm/hr
    "rain_flood_high":       18,    # mm/hr
    "rain_flood_critical":   30,    # mm/hr
    "rain24_flood_moderate": 30,    # mm/24hr
    "rain24_flood_high":     60,    # mm/24hr
    "rain24_flood_critical": 100,   # mm/24hr
    "temp_heat_moderate":    32,    # °C
    "temp_heat_high":        37,    # °C
    "temp_heat_critical":    41,    # °C
    "soil_flood_modifier":   0.45,  # must exceed this for flood labels
}

# ── Percentile thresholds per location ────────────────────
def compute_thresholds(group):
    return pd.Series({
        "rain_p85":   group["rain_current"].quantile(0.85),
        "rain_p95":   group["rain_current"].quantile(0.95),
        "rain_p99":   group["rain_current"].quantile(0.99),
        "wind_p85":   group["wind_speed"].quantile(0.85),
        "wind_p95":   group["wind_speed"].quantile(0.95),
        "wind_p99":   group["wind_speed"].quantile(0.99),
        "temp_p85":   group["temperature"].quantile(0.85),
        "temp_p95":   group["temperature"].quantile(0.95),
        "rain24_p85": group["rain_24h_forecast"].quantile(0.85),
        "rain24_p95": group["rain_24h_forecast"].quantile(0.95),
        "rain24_p99": group["rain_24h_forecast"].quantile(0.99),
        "soil_p85":   group["soil_moisture"].quantile(0.85),
        "soil_p95":   group["soil_moisture"].quantile(0.95),
    })

thresholds = df.groupby("location").apply(
    compute_thresholds,
    include_groups=False
)
df = df.join(thresholds, on="location")

# ── Hybrid labeling ────────────────────────────────────────
# Rule: BOTH the percentile AND the absolute floor must be met
# If either fails → drop down to lower severity or NORMAL

def label_row(row):

    # ── CYCLONE checks ──────────────────────────────────────
    if (row["wind_speed"] >= row["wind_p99"] and
            row["wind_speed"] >= FLOORS["wind_cyclone_critical"]):
        return "CRITICAL", "CYCLONE"

    if (row["wind_speed"] >= row["wind_p95"] and
            row["wind_speed"] >= FLOORS["wind_cyclone_high"]):
        return "HIGH", "CYCLONE"

    if (row["wind_speed"] >= row["wind_p85"] and
            row["wind_speed"] >= FLOORS["wind_cyclone_moderate"]):
        return "MODERATE", "CYCLONE"

    # ── FLOOD checks ───────────────────────────────────────
    if (row["rain_24h_forecast"] >= row["rain24_p99"] and
            row["rain_24h_forecast"] >= FLOORS["rain24_flood_critical"]):
        return "CRITICAL", "FLOOD"

    if (row["rain_24h_forecast"] >= row["rain24_p95"] and
            row["rain24_p95"] >= FLOORS["rain24_flood_high"] and
            row["soil_moisture"] >= FLOORS["soil_flood_modifier"]):
        return "HIGH", "FLOOD"

    if (row["rain_current"] >= row["rain_p95"] and
            row["rain_current"] >= FLOORS["rain_flood_high"] and
            row["soil_moisture"] >= FLOORS["soil_flood_modifier"]):
        return "HIGH", "FLOOD"

    if (row["rain_24h_forecast"] >= row["rain24_p85"] and
            row["rain_24h_forecast"] >= FLOORS["rain24_flood_moderate"]):
        return "MODERATE", "FLOOD"

    if (row["rain_current"] >= row["rain_p85"] and
            row["rain_current"] >= FLOORS["rain_flood_moderate"]):
        return "MODERATE", "FLOOD"

    # ── HEATWAVE checks ────────────────────────────────────
    if (row["temperature"] >= row["temp_p95"] and
            row["temperature"] >= FLOORS["temp_heat_critical"]):
        return "CRITICAL", "HEATWAVE"

    if (row["temperature"] >= row["temp_p85"] and
            row["temperature"] >= FLOORS["temp_heat_high"]):
        return "HIGH", "HEATWAVE"

    if row["temperature"] >= FLOORS["temp_heat_moderate"]:
        return "MODERATE", "HEATWAVE"

    return "NORMAL", "NONE"

print("Labeling rows...")
results = df.apply(label_row, axis=1)
df["risk_level"] = results.apply(lambda x: x[0])
df["risk_type"]  = results.apply(lambda x: x[1])

print("\nLabel distribution:")
print(df["risk_level"].value_counts())
print(f"\nNORMAL %: "
      f"{(df['risk_level']=='NORMAL').sum()/len(df)*100:.1f}%")

print("\nRisk type distribution:")
print(df["risk_type"].value_counts())

# Print what the floor thresholds actually cut
print("\nFloor threshold verification:")
print(f"  Rows with wind > 25km/h: "
      f"{(df['wind_speed'] > 25).sum()}")
print(f"  Rows with rain > 8mm/hr: "
      f"{(df['rain_current'] > 8).sum()}")
print(f"  Rows with temp > 32°C:   "
      f"{(df['temperature'] > 32).sum()}")

threshold_cols = [c for c in df.columns if "_p" in c]
df = df.drop(columns=threshold_cols)
df.to_csv("labeled_data.csv", index=False)
print("\nSaved to labeled_data.csv")