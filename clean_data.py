import pandas as pd

df = pd.read_csv("raw_data.csv")

print("Before cleaning:", len(df), "rows")
print("Missing values:\n", df.isnull().sum())

# Drop rows with any missing values first
df = df.dropna()

# Sanity filters
df = df[df["rain_current"] >= 0]
df = df[df["wind_speed"] >= 0]
df = df[df["temperature"] > -20]
df = df[df["humidity"].between(0, 100)]
df = df[df["pressure"].between(800, 1100)]

# Generate soil_moisture synthetically
# Logic: soil absorbs rain over time, humidity contributes
# Normalize both to 0-1 range and blend them
df["soil_moisture"] = (
    (df["rain_current"].clip(0, 100) / 100) * 0.6 +
    (df["humidity"] / 100) * 0.4
).clip(0, 1)

# Engineer rain_24h_forecast as rolling forward sum
df = df.sort_values(["location", "time"]).reset_index(drop=True)
df["rain_24h_forecast"] = (
    df.groupby("location")["rain_current"]
    .transform(lambda x: x.rolling(24, min_periods=1).sum().shift(-24))
)
df = df.dropna(subset=["rain_24h_forecast"])

print("After cleaning:", len(df), "rows")
df.to_csv("clean_data.csv", index=False)
print("Saved to clean_data.csv")