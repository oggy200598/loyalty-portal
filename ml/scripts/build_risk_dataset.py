"""Build buyer risk feature dataset from PostgreSQL (PHASE 1 - no training).

Pipeline:
    PostgreSQL -> Feature Dataset -> Cleaning -> Validation -> Parquet/CSV

Rules enforced in this phase:
- Snapshot-based dataset: one row per (buyer_id, feature_date).
- STRICT time-leakage prevention: features at snapshot T only use data <= T.
- NO labels, NO risk scores, NO fake data.
- ID columns (buyer_id) are kept as metadata only - never ML features.

Usage:
    python ml/scripts/build_risk_dataset.py
"""
from __future__ import annotations

import logging
import os
import sys
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# ---------------------------------------------------------------------------
# Paths & config
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
from ml.features import FEATURE_COLUMNS as MODEL_FEATURES, ORDERS_SQL, HISTORY_SQL, VN_TZ, as_utc, features_at, snapshot_cutoff, timelines

load_dotenv(PROJECT_ROOT / "backend" / ".env")

DATA_DIR = PROJECT_ROOT / "ml" / "data" / "processed"
PARQUET_PATH = DATA_DIR / "buyer_risk_dataset_v2.parquet"
CSV_PATH = DATA_DIR / "buyer_risk_dataset_v2.csv"

from ml.config import get_database_url
DATABASE_URL = get_database_url()

# Final ML feature columns (exact order required by spec).
FEATURE_COLUMNS = MODEL_FEATURES + ['account_age_days', 'total_orders', 'completed_rate']

# Metadata/debug columns - kept in the dataset but NOT used as ML features.
METADATA_COLUMNS = ["buyer_id", "feature_date"]

DATASET_COLUMNS = METADATA_COLUMNS + FEATURE_COLUMNS

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
log = logging.getLogger("build_risk_dataset")


def info(msg: str) -> None:
    """Eager log helper (avoids %-placeholder leakage in odd consoles)."""
    log.info(msg)


def warn(msg: str) -> None:
    log.warning(msg)


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------
def build_snapshot_frame(conn):
    snapshots = conn.execute(text('SELECT buyer_id, feature_date FROM buyer_features ORDER BY buyer_id, feature_date')).mappings().all()
    orders = conn.execute(text(ORDERS_SQL)).mappings().all()
    events = conn.execute(text(HISTORY_SQL)).mappings().all()
    users = {str(row['id']): as_utc(row['created_at']) for row in conn.execute(text('SELECT id, created_at FROM users')).mappings()}
    history = timelines(orders, events)
    records = []
    for snapshot in snapshots:
        buyer_id = str(snapshot['buyer_id'])
        feature_date = snapshot['feature_date']
        if buyer_id not in users:
            continue
        record = features_at(history.get(buyer_id, []), snapshot_cutoff(feature_date))
        record.update(buyer_id=buyer_id, feature_date=feature_date,
                      account_age_days=max((feature_date - users[buyer_id].astimezone(VN_TZ).date()).days, 0))
        records.append(record)
    return pd.DataFrame(records, columns=DATASET_COLUMNS)


def load_snapshot_data(engine):
    with engine.connect().execution_options(isolation_level='REPEATABLE READ') as conn:
        df = build_snapshot_frame(conn)
    return df, sorted(df['feature_date'].unique().tolist())


# ---------------------------------------------------------------------------
# Cleaning
# ---------------------------------------------------------------------------
def clean_dataset(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Clean the raw snapshot dataframe. Returns (clean_df, stats)."""
    info("Cleaning dataset")
    stats: dict = {}

    stats["input_rows"] = len(df)

    # --- Duplicates on (buyer_id, feature_date) ---------------------------
    dup_mask = df.duplicated(subset=["buyer_id", "feature_date"], keep="first")
    stats["duplicate_rows_dropped"] = int(dup_mask.sum())
    if dup_mask.any():
        warn(f"Dropping {int(dup_mask.sum())} duplicate (buyer_id, feature_date) rows")
    df = df[~dup_mask].copy()

    # --- Nulls -------------------------------------------------------------
    null_counts = df[FEATURE_COLUMNS].isna().sum()
    stats["null_cells"] = int(null_counts.sum())
    for col in null_counts[null_counts > 0].index:
        warn(f"Column '{col}' has {int(null_counts[col])} null value(s)")
    before = len(df)
    df = df.dropna(subset=FEATURE_COLUMNS)
    stats["rows_dropped_for_nulls"] = before - len(df)

    # --- Infinity ----------------------------------------------------------
    inf_mask = np.isinf(df[FEATURE_COLUMNS].to_numpy(dtype=float)).any(axis=1)
    stats["inf_rows_dropped"] = int(inf_mask.sum())
    if inf_mask.any():
        warn(f"Dropping {int(inf_mask.sum())} row(s) with infinity values")
    df = df[~inf_mask].copy()

    # --- Invalid ranges ----------------------------------------------------
    rate_cols = [c for c in ("cancel_rate", "return_rate", "failure_rate", "non_receive_rate", "completed_rate") if c in df.columns]
    bad_rate = pd.Series(False, index=df.index)
    for col in rate_cols:
        m = ~df[col].between(0, 1)
        cnt = int(m.sum())
        if cnt:
            warn(f"Column '{col}': {cnt} value(s) outside [0, 1]")
            stats[f"invalid_{col}"] = cnt
        bad_rate |= m

    bad_neg = pd.Series(False, index=df.index)
    for col in (
        "orders_last_7_days",
        "orders_last_30_days",
        "account_age_days",
        "average_order_value",
        "total_order_value",
        "total_orders",
    ):
        m = df[col] < 0
        cnt = int(m.sum())
        if cnt:
            warn(f"Column '{col}': {cnt} negative value(s)")
            stats[f"negative_{col}"] = cnt
        bad_neg |= m

    invalid_total = int((bad_rate | bad_neg).sum())
    stats["invalid_range_rows_dropped"] = invalid_total
    if invalid_total:
        warn(f"Dropping {invalid_total} row(s) with out-of-range values")
    df = df[~(bad_rate | bad_neg)].copy()

    # Clip rates into [0, 1] defensively after dropping hard violations.
    for col in rate_cols:
        df[col] = df[col].clip(0.0, 1.0)

    stats["output_rows"] = len(df)
    return df, stats


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
def validate_dataset(df: pd.DataFrame) -> None:
    """Raise ValueError with a clear message if any rule is violated."""
    info("Validating dataset")

    if len(df) == 0:
        raise ValueError("Validation failed: dataset has zero rows.")

    dup = df.duplicated(subset=["buyer_id", "feature_date"])
    if dup.any():
        raise ValueError(
            f"Validation failed: {int(dup.sum())} duplicate (buyer_id, feature_date) rows."
        )

    if df[FEATURE_COLUMNS].isna().any().any():
        raise ValueError("Validation failed: NaN found in feature columns.")

    if np.isinf(df[FEATURE_COLUMNS].to_numpy(dtype=float)).any():
        raise ValueError("Validation failed: infinity found in feature columns.")

    for col in ("cancel_rate", "return_rate", "failure_rate", "non_receive_rate", "completed_rate"):
        if not df[col].between(0, 1).all():
            raise ValueError(f"Validation failed: '{col}' outside [0, 1].")

    for col in (
        "orders_last_7_days",
        "orders_last_30_days",
        "account_age_days",
        "average_order_value",
        "total_order_value",
        "total_orders",
    ):
        if (df[col] < 0).any():
            raise ValueError(f"Validation failed: negative values in '{col}'.")

    # orders_last_7_days must never exceed orders_last_30_days.
    bad_window = df["orders_last_7_days"] > df["orders_last_30_days"]
    if bad_window.any():
        raise ValueError(
            f"Validation failed: {int(bad_window.sum())} row(s) where "
            "orders_last_7_days > orders_last_30_days."
        )

    try:
        parsed = pd.to_datetime(df["feature_date"])
        if parsed.isna().any():
            raise ValueError
    except Exception as exc:
        raise ValueError("Validation failed: invalid feature_date.") from exc

    expected = METADATA_COLUMNS + FEATURE_COLUMNS
    if list(df.columns) != expected:
        raise ValueError(
            f"Validation failed: column order mismatch.\nExpected: {expected}\nGot: {list(df.columns)}"
        )

    info("Validation passed")


# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------
def print_statistics(df: pd.DataFrame) -> None:
    info("Dataset statistics")

    n_buyers = df["buyer_id"].nunique()
    n_snapshots = len(df)
    min_date = df["feature_date"].min()
    max_date = df["feature_date"].max()

    print("=" * 70)
    print("DATASET SUMMARY")
    print("=" * 70)
    print(f"Rows (snapshots)   : {n_snapshots}")
    print(f"Unique buyers      : {n_buyers}")
    print(f"Min feature_date   : {min_date}")
    print(f"Max feature_date   : {max_date}")
    print(f"Snapshot day span  : {(max_date - min_date).days + 1} day(s)")
    print()
    print("-" * 70)
    print("NUMERIC FEATURE STATISTICS (mean / median / p90 / p95 / p99 / min / max)")
    print("-" * 70)
    for col in FEATURE_COLUMNS:
        s = df[col]
        print(
            f"{col:<22} mean={s.mean():>14,.4f}  median={s.median():>12,.4f}  "
            f"p90={s.quantile(0.90):>12,.4f}  p95={s.quantile(0.95):>12,.4f}  "
            f"p99={s.quantile(0.99):>12,.4f}"
        )
        print(
            f"{'':<22} min={s.min():>14,.4f}  max={s.max():>14,.4f}"
        )
    print()
    print("-" * 70)
    print("KEY RISK FEATURES (detail)")
    print("-" * 70)
    for col in (
        "cancel_rate",
        "failure_rate",
        "non_receive_rate",
        "orders_last_7_days",
        "orders_last_30_days",
        "average_order_value",
        "avg_order_interval",
    ):
        s = df[col]
        print(
            f"{col:<22} mean={s.mean():>12,.4f}  std={s.std():>12,.4f}  "
            f"min={s.min():>12,.4f}  max={s.max():>12,.4f}"
        )
    print()

    if n_buyers >= 3:
        print("-" * 70)
        print("CORRELATION MATRIX (feature columns)")
        print("-" * 70)
        corr = df[FEATURE_COLUMNS].corr()
        print(corr.to_string(float_format=lambda v: f"{v:+.3f}"))
        print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    info("Connecting PostgreSQL")
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

    df, dates = load_snapshot_data(engine)

    preview = ", ".join(str(d) for d in dates[:5])
    suffix = " ..." if len(dates) > 5 else ""
    info(f"Snapshot coverage: {len(dates)} distinct feature_date(s): {preview}{suffix}")
    if len(dates) <= 1:
        warn(
            f"Database currently has only {len(dates)} snapshot day(s) in "
            "buyer_features. Dataset will contain ONE snapshot per buyer "
            "(no fabricated daily rows)."
        )

    df, _stats = clean_dataset(df)
    validate_dataset(df)

    # Re-order columns exactly as specified.
    df = df[DATASET_COLUMNS]

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    saved_as = []
    try:
        df.to_parquet(PARQUET_PATH, index=False)
        saved_as.append(str(PARQUET_PATH))
        info(f"Saved parquet: {PARQUET_PATH}")
    except Exception as exc:
        warn(f"Parquet export unavailable: {exc}")

    # Always write CSV as fallback/companion.
    df.to_csv(CSV_PATH, index=False)
    saved_as.append(str(CSV_PATH))
    info(f"Saved CSV: {CSV_PATH}")

    print_statistics(df)

    print("=" * 70)
    print("OUTPUT FILES")
    print("=" * 70)
    for path in saved_as:
        print(f"  {path}")
    print()


if __name__ == "__main__":
    main()
