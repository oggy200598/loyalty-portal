"""FastAPI service: predict risk cho buyer và ghi kết quả vào DB.

Chạy: uvicorn app:app --port 8000
Endpoints:
  POST /predict/{buyer_id}          — chấm điểm + ghi DB, trả kết quả
  GET  /predict/{buyer_id}?dry_run=1 — chỉ chấm điểm, không ghi DB
  GET  /health
"""
from pathlib import Path

import joblib
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

import db
from config import (
    FEATURE_COLUMNS,
    THRESHOLD_CRITICAL,
    THRESHOLD_HIGH,
    THRESHOLD_MEDIUM,
)

MODEL_PATH = Path(__file__).parent / "model.joblib"

app = FastAPI(title="Risk ML Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_model = None


def get_model():
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise HTTPException(
                status_code=503,
                detail="Model chưa được train. Chạy 'python train.py' trước.",
            )
        _model = joblib.load(MODEL_PATH)
    return _model


def level_from_probability(p: float) -> str:
    if p >= THRESHOLD_CRITICAL:
        return "CRITICAL"
    if p >= THRESHOLD_HIGH:
        return "HIGH"
    if p >= THRESHOLD_MEDIUM:
        return "MEDIUM"
    return "LOW"


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model_loaded": MODEL_PATH.exists(),
    }


@app.post("/predict/{buyer_id}")
def predict_and_save(buyer_id: str) -> dict:
    result = _predict(buyer_id)
    db.write_prediction(result)
    return result


@app.get("/predict/{buyer_id}")
def predict_dry(buyer_id: str, dry_run: int = Query(default=1)) -> dict:
    result = _predict(buyer_id)
    if not dry_run:
        db.write_prediction(result)
    return result


def _predict(buyer_id: str) -> dict:
    features = db.load_buyer_features(buyer_id)
    if features is None:
        raise HTTPException(
            status_code=404,
            detail=f"Không có buyer_features cho buyer {buyer_id}",
        )

    model = get_model()
    X = [[features[col] for col in FEATURE_COLUMNS]]
    probability = float(model.predict_proba(X)[0][1])
    level = level_from_probability(probability)
    score = round(probability * 100, 2)

    # Explanations đơn giản: feature importance × giá trị feature
    importances = getattr(model, "feature_importances_", [1 / len(FEATURE_COLUMNS)] * len(FEATURE_COLUMNS))
    explanations = []
    for col, imp in zip(FEATURE_COLUMNS, importances):
        value = features[col]
        impact = round(float(imp) * min(value, 1.0), 5)
        explanations.append(
            {
                "feature_name": col,
                "feature_value": round(value, 5),
                "impact_value": impact,
                "impact_direction": (
                    "POSITIVE" if impact > 0.05 else "NEGATIVE" if impact < -0.05 else "NEUTRAL"
                ),
                "description": f"{col} = {value:.3f} (đóng góp ~{impact:.3f})",
            }
        )
    # Sắp theo độ ảnh hưởng giảm dần
    explanations.sort(key=lambda e: abs(e["impact_value"]), reverse=True)

    return {
        "buyer_id": buyer_id,
        "risk_probability": round(probability, 5),
        "risk_score": score,
        "risk_level": level,
        "explanations": explanations[:8],
    }
