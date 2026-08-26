# ML Service — Pipeline dự đoán rủi ro buyer

Service Python (FastAPI + scikit-learn) thay thế heuristic scoring trong backend NestJS.

## Kiến trúc

```
buyer_features + buyer_profiles (PostgreSQL)
        │
        ▼
train.py  ──train──▶ model.joblib + ml_models (active) + ml_training_runs
        │
        ▼
app.py (FastAPI :8000)
  POST /predict/{buyer_id}  → risk_predictions + risk_explanations + recommendations
```

Backend NestJS đọc kết quả từ DB như trước — không cần đổi code đọc.

## Cài đặt

```bash
cd ml-service
pip install -r requirements.txt
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecommerce_risk
```

## Train model

```bash
python train.py
```

- Load dữ liệu từ `buyer_features` JOIN `buyer_profiles`
- Label: buyer "xấu" nếu ≥30% đơn bị cancel/return/fail/non-receive
- Model: GradientBoostingClassifier
- Ghi metrics vào `ml_models` (đặt active) + `ml_training_runs`

## Chạy service

```bash
uvicorn app:app --port 8000
```

| Endpoint | Mô tả |
|---|---|
| `POST /predict/{buyer_id}` | Chấm điểm + ghi `risk_predictions`/`risk_explanations`/`recommendations` vào DB |
| `GET /predict/{buyer_id}?dry_run=1` | Chấm điểm thử, không ghi DB |
| `GET /health` | Trạng thái service |

## Tích hợp với backend NestJS (tùy chọn)

Để `RiskScoringService` gọi ML service thay vì heuristic, thêm HTTP call:

```ts
// risk-scoring.service.ts
const res = await fetch(`http://localhost:8000/predict/${buyerId}`);
if (res.ok) return await res.json(); // ML service đã ghi DB
// fallback: heuristic hiện tại
```

## Lưu ý

- Cần dữ liệu seed trong `buyer_features`/`buyer_profiles` (xem `Stack/seed_ecommerce_risk.sql`)
- Model cần retrain định kỳ khi có dữ liệu mới (cron: `python train.py`)
