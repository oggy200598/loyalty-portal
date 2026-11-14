"""Authenticated ML API with immutable, registry-linked model bundles."""
import secrets
from pathlib import Path
from uuid import UUID
import joblib
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
import db
from config import FEATURE_COLUMNS, FEATURE_CONTRACT, ML_SERVICE_TOKEN, MODEL_DIR, THRESHOLD_CRITICAL, THRESHOLD_HIGH, THRESHOLD_MEDIUM

app = FastAPI(title='Risk ML Service', version='2.0.0')
_cached_bundle = None


def authorize(x_service_token: str = Header(default='')):
    if len(ML_SERVICE_TOKEN) < 32:
        raise HTTPException(status_code=503, detail='Service authentication is not configured')
    if not secrets.compare_digest(x_service_token, ML_SERVICE_TOKEN):
        raise HTTPException(status_code=401, detail='Invalid service credential')


def get_model():
    global _cached_bundle
    registry = db.get_active_model()
    if not registry or not registry['model_path']:
        raise HTTPException(status_code=503, detail='No published model')
    path = Path(registry['model_path']).resolve()
    if not path.is_relative_to(MODEL_DIR.resolve()) or not path.is_file():
        raise HTTPException(status_code=503, detail='Model artifact unavailable')
    if _cached_bundle is None or _cached_bundle['model_id'] != registry['id']:
        bundle = joblib.load(path)
        if bundle.get('model_id') != registry['id'] or bundle.get('version') != registry['version'] or bundle.get('feature_columns') != FEATURE_COLUMNS or bundle.get('feature_contract') != FEATURE_CONTRACT:
            raise HTTPException(status_code=503, detail='Model registry and feature contract do not match')
        _cached_bundle = bundle
    return _cached_bundle


def level_from_probability(p):
    if p >= THRESHOLD_CRITICAL: return 'CRITICAL'
    if p >= THRESHOLD_HIGH: return 'HIGH'
    if p >= THRESHOLD_MEDIUM: return 'MEDIUM'
    return 'LOW'


class PredictionRequest(BaseModel):
    order_id: int | None = Field(default=None, gt=0)


@app.get('/health')
def health():
    return {'status': 'ok', 'model_loaded': _cached_bundle is not None}


@app.post('/predict/{buyer_id}', dependencies=[Depends(authorize)])
def predict_and_save(buyer_id: UUID, body: PredictionRequest):
    result = _predict(str(buyer_id))
    result['order_id'] = body.order_id
    try:
        return db.write_prediction(result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail='Order does not belong to buyer') from exc


@app.get('/predict/{buyer_id}', dependencies=[Depends(authorize)])
def predict_dry(buyer_id: UUID):
    # GET is always read-only; no query parameter can enable writes.
    return _predict(str(buyer_id))


def _predict(buyer_id):
    features = db.load_buyer_features(buyer_id)
    if features is None:
        raise HTTPException(status_code=404, detail='Insufficient buyer history for an assessment')
    bundle = get_model()
    model = bundle['model']
    probability = float(model.predict_proba([[features[column] for column in FEATURE_COLUMNS]])[0][1])
    importances = model.feature_importances_
    explanations = [{'feature_name': column, 'feature_value': round(float(features[column]), 5), 'impact_value': None, 'impact_direction': 'NEUTRAL',
                     'description': f'Global feature importance {float(importance):.4f}; not a local contribution', 'global_importance': float(importance)} for column, importance in zip(FEATURE_COLUMNS, importances)]
    explanations.sort(key=lambda entry: entry['global_importance'], reverse=True)
    return {'buyer_id': buyer_id, 'model_id': bundle['model_id'], 'model_version': bundle['version'], 'risk_probability': round(probability, 5), 'risk_score': round(probability * 100, 2), 'risk_level': level_from_probability(probability), 'explanations': explanations[:8]}
