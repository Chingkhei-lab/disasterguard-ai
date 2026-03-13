import requests
import json

BASE = "http://localhost:8000"

def test(name, payload, expected_level):
    r = requests.post(f"{BASE}/predict", json=payload)
    result = r.json()
    status = "[OK]" if result["risk_level"] == expected_level else "[FAIL]"
    print(f"{status} {name}")
    print(f"  Expected: {expected_level}")
    print(f"  Got:      {result['risk_level']}_{result['risk_type']}"
          f"  (confidence: {result['confidence']:.2f},"
          f"  fallback: {result['fallback_used']})\n")

print("=== DisasterGuard ML Service Tests ===\n")

# Health check
h = requests.get(f"{BASE}/health").json()
print(f"Health: {h['status']} | Model loaded: {h['model_loaded']}\n")

# Test cases
test("Heavy rain — expect CRITICAL FLOOD",
    payload={
        "rain_current": 28.0,
        "rain_24h_forecast": 180.0,
        "wind_speed": 35.0,
        "wind_gusts": 50.0,
        "temperature": 27.0,
        "humidity": 96.0,
        "pressure": 994.0,
        "soil_moisture": 0.88
    },
    expected_level="CRITICAL"
)

test("High winds — expect HIGH or CRITICAL CYCLONE",
    payload={
        "rain_current": 5.0,
        "rain_24h_forecast": 20.0,
        "wind_speed": 75.0,
        "wind_gusts": 95.0,
        "temperature": 29.0,
        "humidity": 80.0,
        "pressure": 990.0,
        "soil_moisture": 0.3
    },
    expected_level="HIGH"
)

test("Hot dry day — expect MODERATE or HIGH HEATWAVE",
    payload={
        "rain_current": 0.0,
        "rain_24h_forecast": 0.0,
        "wind_speed": 12.0,
        "wind_gusts": 18.0,
        "temperature": 38.5,
        "humidity": 35.0,
        "pressure": 1005.0,
        "soil_moisture": 0.1
    },
    expected_level="MODERATE"
)

test("Normal day — expect NORMAL",
    payload={
        "rain_current": 0.0,
        "rain_24h_forecast": 2.0,
        "wind_speed": 10.0,
        "wind_gusts": 15.0,
        "temperature": 26.0,
        "humidity": 65.0,
        "pressure": 1010.0,
        "soil_moisture": 0.35
    },
    expected_level="NORMAL"
)

# Model info
info = requests.get(f"{BASE}/model-info").json()
print("Model info endpoint:")
print(f"  Accuracy:  {info['overall_accuracy']}")
print(f"  Classes:   {len(info['classes'])}")
print(f"  Top feature: "
      f"{list(info['feature_importances'].keys())[0]}")
