"""Cấu hình kết nối DB cho ML service."""
import os

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/ecommerce_risk",
)

# Ngưỡng phân loại risk level từ xác suất
THRESHOLD_MEDIUM = 0.25
THRESHOLD_HIGH = 0.50
THRESHOLD_CRITICAL = 0.80

# Các feature dùng để train/predict (khớp bảng buyer_features)
FEATURE_COLUMNS = [
    "cancel_rate",
    "return_rate",
    "failure_rate",
    "non_receive_rate",
    "total_order_value",
    "average_order_value",
    "orders_last_7_days",
    "orders_last_30_days",
    "avg_order_interval",
]
