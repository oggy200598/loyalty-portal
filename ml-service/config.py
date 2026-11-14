"""Configuration shared with the backend; no database credential defaults."""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / 'backend' / '.env')
from ml.features import FEATURE_COLUMNS, FEATURE_CONTRACT
DATABASE_URL = os.environ.get('DATABASE_URL', '').split('?')[0]
ML_SERVICE_TOKEN = os.environ.get('ML_SERVICE_TOKEN', '')
MODEL_DIR = Path(__file__).resolve().parent / 'models'
THRESHOLD_MEDIUM = 0.25
THRESHOLD_HIGH = 0.50
THRESHOLD_CRITICAL = 0.80
