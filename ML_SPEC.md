# ML_SPEC.md — DisasterGuard AI Risk Model

## Purpose
The ML service is the brain of DisasterGuard AI. It replaces
the naive threshold-checking of the previous project with a
trained model that recognizes patterns in weather data that
PRECEDE disasters — not just react to them.

---

## Why Random Forest
- Handles mixed numeric features well
- No feature scaling required
- Resistant to overfitting on small datasets
- Outputs confidence scores natively via predict_proba
- Interpretable — can explain why a prediction was made
- Trains in under 60 seconds on our dataset size

---

## Model Input Features
Exactly 8 features. Order matters for joblib serialization.

| Index | Feature | Unit | Source |
|-------|---------|------|--------|
| 0 | rain_current | mm | Open-Meteo hourly |
| 1 | rain_24h_forecast | mm | Open-Meteo next 24h sum |
| 2 | wind_speed | km/h | Open-Meteo hourly |
| 3 | wind_gusts | km/h | Open-Meteo hourly |
| 4 | temperature | °C | Open-Meteo hourly |
| 5 | humidity | % | Open-Meteo hourly |
| 6 | pressure | hPa | Open-Meteo hourly |
| 7 | soil_moisture | m³/m³ | Open-Meteo hourly |

---

## Model Output
```python
{
    "risk_level": "HIGH",       # NORMAL | MODERATE | HIGH | CRITICAL
    "risk_type": "FLOOD",       # NONE | FLOOD | CYCLONE | HEATWAVE | LANDSLIDE
    "confidence": 0.87,         # float 0.0 to 1.0
    "fallback_used": False      # True if rule-based fallback was used
}
```

---

## Training Data

### Source
Historical hourly data from Open-Meteo Archive API.
```
https://archive-api.open-meteo.com/v1/archive
  ?latitude={lat}
  &longitude={lng}
  &start_date=2022-01-01
  &end_date=2024-01-01
  &hourly=rain,soil_moisture_0_to_1cm,windspeed_10m,
          windgusts_10m,temperature_2m,
          relativehumidity_2m,surface_pressure
```

### Locations to Pull Data From
Pull from all 6 target regions and combine:
- Imphal (24.817, 93.936)
- Dimapur (25.909, 93.727)
- Guwahati (26.144, 91.736)
- Shillong (25.578, 91.893)
- Kohima (25.670, 94.110)
- Silchar (24.827, 92.797)

### Expected Dataset Size
~17,520 hourly rows per location x 6 locations = ~105,000 rows
After cleaning and labeling expect ~90,000 usable rows.

---

## Labeling Strategy
We have no ground truth disaster labels so we generate them
using the threshold rules as a labeling function on HISTORICAL
data. This is the key difference from the previous project:

Previous project: thresholds ARE the decision at runtime
This model: thresholds label historical data → model learns
            the patterns that LEAD to those thresholds
```python
def label_row(row):
    # CRITICAL labels
    if row['wind_speed'] > 89:
        return 'CRITICAL', 'CYCLONE'
    if row['rain_24h_forecast'] > 100:
        return 'CRITICAL', 'FLOOD'
    if row['temperature'] > 45:
        return 'CRITICAL', 'HEATWAVE'

    # HIGH labels
    if row['wind_speed'] > 62:
        return 'HIGH', 'CYCLONE'
    if row['rain_current'] > 50 and row['soil_moisture'] > 0.4:
        return 'HIGH', 'FLOOD'
    if row['rain_current'] > 80 and row['soil_moisture'] > 0.6:
        return 'HIGH', 'LANDSLIDE'
    if row['temperature'] > 40:
        return 'HIGH', 'HEATWAVE'

    # MODERATE labels (within 80% of HIGH thresholds)
    if row['wind_speed'] > 50:
        return 'MODERATE', 'CYCLONE'
    if row['rain_current'] > 35 and row['soil_moisture'] > 0.3:
        return 'MODERATE', 'FLOOD'
    if row['temperature'] > 37:
        return 'MODERATE', 'HEATWAVE'

    return 'NORMAL', 'NONE'
```

---

## Training Script Outline — `train.py`
```python
# Step 1 — Fetch historical data from Open-Meteo Archive
# Step 2 — Combine all 6 location datasets
# Step 3 — Engineer rain_24h_forecast as rolling 24h sum
# Step 4 — Apply label_row() to generate target column
# Step 5 — Split into features X and labels y
# Step 6 — Handle class imbalance with SMOTE
#           (NORMAL will dominate — must oversample disaster rows)
# Step 7 — Train RandomForestClassifier
#           n_estimators=200, max_depth=15, random_state=42
# Step 8 — Evaluate with classification report
#           Target: >85% precision on HIGH and CRITICAL classes
# Step 9 — Save with joblib
#           joblib.dump(model, 'risk_model.pkl')
```

---

## FastAPI Service Structure — `main.py`
```python
# Endpoints:

GET  /health
# Returns: { "status": "ok" }
# Purpose: Wake-up ping, health check

POST /predict
# Body: 8 feature values as JSON
# Returns: risk_level, risk_type, confidence, fallback_used

GET  /model-info
# Returns: model accuracy, training date, feature importances
# Purpose: Transparency — judges can verify model is real
```

---

## Fallback Rules
If `risk_model.pkl` fails to load or predict, the service
falls back to rule-based logic and sets `fallback_used: True`.
The Next.js frontend must display a small indicator when
fallback was used — never silently hide this.

---

## Class Imbalance Handling
Historical weather data is mostly NORMAL. Without correction
the model will learn to always predict NORMAL.

Solution: Use SMOTE (Synthetic Minority Oversampling Technique)
```
pip install imbalanced-learn
from imblearn.over_sampling import SMOTE
```
Apply before train/test split. Target ratio: 60% NORMAL,
40% combined disaster classes.

---

## Model Performance Expectations

| Class | Target Precision | Target Recall |
|-------|-----------------|---------------|
| NORMAL | >95% | >95% |
| MODERATE | >75% | >70% |
| HIGH | >85% | >80% |
| CRITICAL | >90% | >90% |

CRITICAL recall is most important — missing a real critical
event is worse than a false alarm.

---

## Python Dependencies — `requirements.txt`
```
fastapi==0.111.0
uvicorn==0.29.0
scikit-learn==1.4.2
imbalanced-learn==0.12.2
pandas==2.2.2
numpy==1.26.4
joblib==1.4.2
python-dotenv==1.0.1
requests==2.31.0
pydantic==2.7.1
```

---

## /model-info Response Example
```json
{
  "status": "ok",
  "model_trained_on": "2024-01-01 to 2024-12-31",
  "locations_trained": 6,
  "training_rows": 89420,
  "accuracy": 0.912,
  "feature_importances": {
    "rain_24h_forecast": 0.31,
    "soil_moisture": 0.22,
    "rain_current": 0.18,
    "wind_gusts": 0.12,
    "pressure": 0.08,
    "wind_speed": 0.05,
    "humidity": 0.03,
    "temperature": 0.01
  }
}
```
This endpoint exists specifically for judge transparency.