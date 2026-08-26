"""Truy xuất dữ liệu training/prediction từ PostgreSQL."""
from typing import Any

import psycopg
from psycopg.rows import dict_row

from config import DATABASE_URL, FEATURE_COLUMNS


def _connect() -> psycopg.Connection:
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def load_training_data() -> tuple[list[list[float]], list[int]]:
    """Lấy (X, y) từ buyer_features + buyer_profiles.

    Label y = 1 nếu buyer có lịch sử xấu (cancel/return/failure/non-receive
    chiếm tỷ lệ đáng kể trong tổng đơn), ngược lại 0.
    """
    query = """
        SELECT bf.cancel_rate, bf.return_rate, bf.failure_rate,
               bf.non_receive_rate, bf.total_order_value,
               bf.average_order_value, bf.orders_last_7_days,
               bf.orders_last_30_days, bf.avg_order_interval,
               bp.total_orders,
               bp.cancelled_orders, bp.returned_orders,
               bp.failed_orders, bp.non_received_orders
        FROM buyer_features bf
        JOIN buyer_profiles bp ON bp.buyer_id = bf.buyer_id
    """

    X: list[list[float]] = []
    y: list[int] = []

    with _connect() as conn, conn.cursor() as cur:
        cur.execute(query)
        for row in cur.fetchall():
            features = [float(row[col] or 0) for col in FEATURE_COLUMNS]
            total = max(int(row["total_orders"] or 0), 1)
            bad = (
                int(row["cancelled_orders"] or 0)
                + int(row["returned_orders"] or 0)
                + int(row["failed_orders"] or 0)
                + int(row["non_received_orders"] or 0)
            )
            X.append(features)
            y.append(1 if bad / total >= 0.3 else 0)

    return X, y


def load_buyer_features(buyer_id: str) -> dict[str, float] | None:
    """Feature mới nhất của một buyer."""
    cols = ", ".join(FEATURE_COLUMNS)
    query = f"""
        SELECT {cols}
        FROM buyer_features
        WHERE buyer_id = %s
        ORDER BY feature_date DESC
        LIMIT 1
    """

    with _connect() as conn, conn.cursor() as cur:
        cur.execute(query, (buyer_id,))
        row = cur.fetchone()
        if row is None:
            return None
        return {col: float(row[col] or 0) for col in FEATURE_COLUMNS}


def write_prediction(result: dict[str, Any]) -> None:
    """Ghi prediction + explanations vào DB để backend NestJS đọc."""
    from config import FEATURE_COLUMNS

    with _connect() as conn, conn.cursor() as cur:
        # Lấy model active
        cur.execute(
            "SELECT id FROM ml_models WHERE is_active = true ORDER BY created_at DESC LIMIT 1"
        )
        model_row = cur.fetchone()
        if model_row is None:
            raise RuntimeError("Chưa có ml_model active — hãy chạy train trước")
        model_id = model_row["id"]

        cur.execute(
            """
            INSERT INTO risk_predictions
                (buyer_id, order_id, model_id, risk_probability, risk_score, risk_level)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                result["buyer_id"],
                result.get("order_id"),
                model_id,
                result["risk_probability"],
                result["risk_score"],
                result["risk_level"],
            ),
        )
        prediction_id = cur.fetchone()["id"]

        for exp in result["explanations"]:
            cur.execute(
                """
                INSERT INTO risk_explanations
                    (prediction_id, feature_name, feature_value,
                     impact_value, impact_direction, description)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    prediction_id,
                    exp["feature_name"],
                    exp.get("feature_value"),
                    exp.get("impact_value"),
                    exp.get("impact_direction"),
                    exp.get("description"),
                ),
            )

        # Tạo recommendation nếu rủi ro cao
        if result["risk_level"] in ("HIGH", "CRITICAL"):
            action_type = "BLOCK_BUYER" if result["risk_level"] == "CRITICAL" else "REQUIRE_PREPAYMENT"
            title = (
                "Cân nhắc chặn buyer do rủi ro cực cao"
                if result["risk_level"] == "CRITICAL"
                else "Yêu cầu thanh toán trước cho đơn này"
            )
            cur.execute(
                """
                INSERT INTO recommendations (prediction_id, action_type, title, description)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    prediction_id,
                    action_type,
                    title,
                    f"Điểm rủi ro {result['risk_score']}/100 ({result['risk_level']}) "
                    f"dự đoán bởi mô hình ML.",
                ),
            )


def record_training_run(
    model_name: str,
    algorithm: str,
    version: str,
    metrics: dict[str, float],
    samples: int,
) -> int:
    """Upsert ml_model active + ghi ml_training_run. Trả về model_id."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("UPDATE ml_models SET is_active = false WHERE is_active = true")
        cur.execute(
            """
            INSERT INTO ml_models
                (model_name, algorithm, version, accuracy, precision_score,
                 recall_score, f1_score, roc_auc, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, true)
            RETURNING id
            """,
            (
                model_name,
                algorithm,
                version,
                metrics.get("accuracy"),
                metrics.get("precision"),
                metrics.get("recall"),
                metrics.get("f1"),
                metrics.get("roc_auc"),
            ),
        )
        model_id = cur.fetchone()["id"]

        cur.execute(
            """
            INSERT INTO ml_training_runs
                (model_id, dataset_version, started_at, completed_at,
                 status, training_samples)
            VALUES (%s, 'buyer_features_v1', now(), now(), 'COMPLETED', %s)
            """,
            (model_id, samples),
        )

    return model_id


# Giữ import FEATURE_COLUMNS dùng ở write_prediction
_ = FEATURE_COLUMNS
