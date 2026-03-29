import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report
from imblearn.over_sampling import SMOTE

FEATURES = ['rain_current','rain_24h_forecast','wind_speed',
            'wind_gusts','temperature','humidity',
            'pressure','soil_moisture']

print("Loading datasets...")
synthetic = pd.read_csv('labeled_data.csv')
real = pd.read_csv('real_event_data.csv')
if 'wind_gusts' not in real.columns:
    real['wind_gusts'] = real['wind_speed'] * 1.3

synthetic['combined_label'] = synthetic['risk_level']+'_'+synthetic['risk_type']
real['combined_label'] = real['risk_level']+'_'+real['risk_type']
real_weighted = pd.concat([real]*5, ignore_index=True)
combined = pd.concat([synthetic, real_weighted], ignore_index=True).dropna(subset=FEATURES+['combined_label'])

X = combined[FEATURES].values
le = LabelEncoder()
y = le.fit_transform(combined['combined_label'])

print("Upsampling and training...")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
X_res, y_res = SMOTE(random_state=42, k_neighbors=5).fit_resample(X_train, y_train)

model = RandomForestClassifier(
    n_estimators=150,
    max_depth=15,
    min_samples_leaf=3,
    class_weight=None,
    random_state=42,
    n_jobs=-1
)
model.fit(X_res, y_res)

y_pred = model.predict(X_test)
print("\n--- CLASSIFICATION REPORT ---")
print(classification_report(y_test, y_pred, target_names=le.classes_))

joblib.dump(model, 'risk_model.pkl', compress=9)
joblib.dump(le, 'label_encoder.pkl', compress=9)
size = os.path.getsize('risk_model.pkl')/(1024*1024)
print(f'Size: {size:.1f} MB')

# Sanity checks
print('\n--- Sanity checks ---')
scenarios = [
    ('Flood',  [28.0,95.0,25.0,32.0,27.0,94.0,994.0,0.75]),
    ('Storm',  [5.0,15.0,85.0,110.0,18.0,72.0,988.0,0.25]),
    ('Heat',   [0.0,0.0,8.0,12.0,38.5,45.0,1006.0,0.08]),
    ('Normal', [0.5,3.0,10.0,14.0,25.0,68.0,1010.0,0.30]),
]
for name, feat in scenarios:
    x = np.array([feat])
    pred = le.inverse_transform(model.predict(x))[0]
    conf = model.predict_proba(x).max()
    print(f'  {name}: {pred} ({conf:.2f})')
