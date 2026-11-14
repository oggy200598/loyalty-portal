"""Shared ML/data-generation configuration."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ENV = PROJECT_ROOT / "backend" / ".env"

load_dotenv(BACKEND_ENV)

DATA_DIR = PROJECT_ROOT / "ml" / "data" / "processed"
BUYER_RISK_PARQUET = DATA_DIR / "buyer_risk_dataset_v2.parquet"
BUYER_RISK_CSV = DATA_DIR / "buyer_risk_dataset_v2.csv"


def get_database_url() -> str:
    """Return the SQL Server/ODBC URL using backend configuration."""
    from ml.sqlserver import sqlalchemy_url
    return sqlalchemy_url()
