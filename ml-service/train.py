"""Train model dự đoán rủi ro buyer từ buyer_features.

Chạy: python train.py
"""
import json
import sys

import joblib
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split

import db
from config import FEATURE_COLUMNS


def main() -> None:
    print("Đang tải dữ liệu training...")
    X, y = db.load_training_data()

    if len(X) < 20:
        print(
            f"[CẢNH BÁO] Chỉ có {len(X)} mẫu — cần >= 20 để train ổn định. "
            "Tiếp tục nhưng metrics có thể không đáng tin."
        )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y if len(set(y)) > 1 else None
    )

    print(f"Training với {len(X_train)} mẫu (test: {len(X_test)})...")
    model = GradientBoostingClassifier(
        n_estimators=150, max_depth=4, learning_rate=0.1, random_state=42
    )
    model.fit(X_train, y_train)

    # Metrics
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1] if len(set(y)) > 1 else y_pred

    metrics = {
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 5),
        "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 5),
        "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 5),
        "f1": round(float(f1_score(y_test, y_pred, zero_division=0)), 5),
        "roc_auc": (
            round(float(roc_auc_score(y_test, y_prob)), 5)
            if len(set(y_test)) > 1
            else None
        ),
    }
    print("Metrics:", json.dumps(metrics, indent=2))

    # Lưu model + feature importance
    joblib.dump(model, "model.joblib")
    importances = {
        col: round(float(imp), 5)
        for col, imp in zip(FEATURE_COLUMNS, model.feature_importances_)
    }
    with open("feature_importance.json", "w", encoding="utf-8") as f:
        json.dump(importances, f, indent=2, ensure_ascii=False)
    print("Feature importance:", json.dumps(importances, indent=2))

    # Ghi vào DB
    version = "1.0.0"
    model_id = db.record_training_run(
        model_name="risk_classifier",
        algorithm="GradientBoostingClassifier",
        version=version,
        metrics=metrics,
        samples=len(X_train),
    )
    print(f"Đã ghi ml_model #{model_id} (active) + training run.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        print(f"LỖI: {exc}", file=sys.stderr)
        sys.exit(1)
