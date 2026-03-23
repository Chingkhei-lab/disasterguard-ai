import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.preprocessing import LabelEncoder
from imblearn.over_sampling import SMOTE
import shutil
import os

FEATURES = [
    "rain_current",
    "rain_24h_forecast",
    "wind_speed",
    "wind_gusts",
    "temperature",
    "humidity",
    "pressure",
    "soil_moisture"
]

# ── Load both datasets ─────────────────────────────────────
print("Loading datasets...")
synthetic = pd.read_csv("labeled_data.csv")
real      = pd.read_csv("real_event_data.csv")

# ── Align columns ──────────────────────────────────────────
# Real event data needs wind_gusts — derive from wind_speed
# Open-Meteo archive doesn't always return gusts separately
if "wind_gusts" not in real.columns:
    real["wind_gusts"] = real["wind_speed"] * 1.3

# Ensure combined_label exists in both
synthetic["combined_label"] = (
    synthetic["risk_level"] + "_" + synthetic["risk_type"]
)
real["combined_label"] = (
    real["risk_level"] + "_" + real["risk_type"]
)
real["is_real_event"] = True
synthetic["is_real_event"] = False

print(f"Synthetic rows: {len(synthetic)}")
print(f"Real event rows: {len(real)}")

# ── Combine with real events weighted 5x ──────────────────
# Real disaster events are rare and precious
# Repeating them 5x forces the model to prioritize them
# without needing to change the algorithm
real_weighted = pd.concat([real] * 5, ignore_index=True)
combined = pd.concat([synthetic, real_weighted], ignore_index=True)
combined = combined.dropna(subset=FEATURES + ["combined_label"])

print(f"\nCombined dataset: {len(combined)} rows")
print("\nLabel distribution after weighting:")
print(combined["combined_label"].value_counts())

# ── Prepare features ───────────────────────────────────────
X = combined[FEATURES].values
le = LabelEncoder()
y = le.fit_transform(combined["combined_label"])

print(f"\nClasses: {le.classes_.tolist()}")

# ── Train/test split ───────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# ── SMOTE ──────────────────────────────────────────────────
print("\nApplying SMOTE...")
smote = SMOTE(random_state=42, k_neighbors=5)
X_train_res, y_train_res = smote.fit_resample(X_train, y_train)

print("After SMOTE:")
unique, counts = np.unique(y_train_res, return_counts=True)
for cls_idx, cnt in zip(unique, counts):
    print(f"  {le.classes_[cls_idx]}: {cnt}")

# ── Train ──────────────────────────────────────────────────
print("\nTraining Random Forest on real + synthetic data...")
model = RandomForestClassifier(
    n_estimators=300,
    max_depth=20,
    min_samples_split=4,
    min_samples_leaf=2,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1
)
model.fit(X_train_res, y_train_res)
print("Training complete")

# ── Evaluate ───────────────────────────────────────────────
print("\nEvaluation on untouched test set:")
y_pred = model.predict(X_test)
print(classification_report(
    y_test, y_pred,
    target_names=le.classes_
))

# ── Feature importances ────────────────────────────────────
print("Feature importances:")
importances = sorted(
    zip(FEATURES, model.feature_importances_),
    key=lambda x: x[1],
    reverse=True
)
for feat, imp in importances:
    bar = "#" * int(imp * 50)
    print(f"  {feat:<22} {imp:.3f} {bar}")

# ── Compare with old model ─────────────────────────────────
print("\nComparing with old model...")
try:
    if os.path.exists("risk_model.pkl"):
        old_model = joblib.load("risk_model.pkl")
        old_pred  = old_model.predict(X_test)
        print("Existing model test accuracy:",
              (old_pred == y_test).mean().round(3))
except Exception as e:
    print(f"Comparison failed: {e}")

print("New model test accuracy:",
      (y_pred == y_test).mean().round(3))

# ── Save ───────────────────────────────────────────────────
# Back up old model first
if os.path.exists("risk_model.pkl"):
    shutil.copy("risk_model.pkl", "risk_model_old.pkl")
    shutil.copy("label_encoder.pkl", "label_encoder_old.pkl")
    print("\nOld model backed up to risk_model_old.pkl")

joblib.dump(model, "risk_model.pkl")
joblib.dump(le, "label_encoder.pkl")
print("New model saved to risk_model.pkl")
print("New encoder saved to label_encoder.pkl")

# ── Quick real-world sanity check ─────────────────────────
print("\n-- Sanity checks on real disaster scenarios --")
scenarios = [
    {
        "name": "Imphal flood pre-conditions (high rain, saturated soil)",
        "features": [28.0, 95.0, 25.0, 32.0, 27.0, 94.0, 994.0, 0.75],
        "expected": "CRITICAL or HIGH FLOOD"
    },
    {
        "name": "Shillong storm pre-conditions (high winds)",
        "features": [5.0, 15.0, 85.0, 110.0, 18.0, 72.0, 988.0, 0.25],
        "expected": "HIGH or CRITICAL CYCLONE"
    },
    {
        "name": "Guwahati heatwave pre-conditions",
        "features": [0.0, 0.0, 8.0, 12.0, 38.5, 45.0, 1006.0, 0.08],
        "expected": "HIGH or CRITICAL HEATWAVE"
    },
    {
        "name": "Normal day Imphal",
        "features": [0.5, 3.0, 10.0, 14.0, 25.0, 68.0, 1010.0, 0.30],
        "expected": "NORMAL"
    },
]

for s in scenarios:
    x     = np.array([s["features"]])
    pred  = model.predict(x)
    proba = model.predict_proba(x)
    conf  = float(proba.max())
    label = le.inverse_transform(pred)[0]
    expected_parts = s["expected"].split(" or ")
    match = "[PASS]" if any(e in label for e in expected_parts) else "[FAIL]"
    print(f"\n  {match} {s['name']}")
    print(f"    Expected: {s['expected']}")
    print(f"    Got:      {label} (confidence: {conf:.2f})")
