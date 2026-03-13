import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.preprocessing import LabelEncoder
from imblearn.over_sampling import SMOTE

# ── Load data ──────────────────────────────────────────────
df = pd.read_csv("labeled_data.csv")

# Merge LANDSLIDE into FLOOD — too few samples for SMOTE
# Conditions are nearly identical anyway
df["risk_type"] = df["risk_type"].replace("LANDSLIDE", "FLOOD")

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

# ── Prepare X and y ────────────────────────────────────────
X = df[FEATURES].values

# Combine into single label: "HIGH_FLOOD", "CRITICAL_CYCLONE"
df["combined_label"] = df["risk_level"] + "_" + df["risk_type"]

le = LabelEncoder()
y = le.fit_transform(df["combined_label"])

print("Classes found:")
for cls in le.classes_:
    count = (df["combined_label"] == cls).sum()
    print(f"  {cls}: {count}")

# ── Train/test split BEFORE SMOTE ──────────────────────────
# Critical: never let SMOTE touch test data
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

print(f"\nTraining set size: {len(X_train)}")
print(f"Test set size:     {len(X_test)}")

# ── Apply SMOTE to training data only ──────────────────────
print("\nApplying SMOTE...")
smote = SMOTE(random_state=42, k_neighbors=5)
X_train_res, y_train_res = smote.fit_resample(X_train, y_train)

print("After SMOTE:")
unique, counts = np.unique(y_train_res, return_counts=True)
for cls_idx, cnt in zip(unique, counts):
    print(f"  {le.classes_[cls_idx]}: {cnt}")

# ── Train model ────────────────────────────────────────────
print("\nTraining Random Forest...")
model = RandomForestClassifier(
    n_estimators=200,
    max_depth=15,
    min_samples_split=5,
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

# ── Save ───────────────────────────────────────────────────
joblib.dump(model, "risk_model.pkl")
joblib.dump(le, "label_encoder.pkl")

print("\nSaved: risk_model.pkl")
print("Saved: label_encoder.pkl")
print("\nDone. Run test_model.py to verify.")
