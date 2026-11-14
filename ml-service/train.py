"""Train on mature future outcomes; use --dry-run to avoid publishing."""
import argparse
import json
import os
import sys
from datetime import datetime, timezone
from uuid import uuid4
import joblib
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
import db
from config import FEATURE_COLUMNS, FEATURE_CONTRACT, MODEL_DIR
from evaluation import split_records


def main(dry_run=False):
    records = db.load_training_records()
    train, test = split_records(records)
    X_train, y_train = [r['features'] for r in train], [r['target'] for r in train]
    X_test, y_test = [r['features'] for r in test], [r['target'] for r in test]
    model = GradientBoostingClassifier(n_estimators=150, max_depth=4, learning_rate=0.1, random_state=42)
    model.fit(X_train, y_train)
    predicted = model.predict(X_test)
    probabilities = model.predict_proba(X_test)[:, 1]
    metrics = {'accuracy': float(accuracy_score(y_test, predicted)), 'precision': float(precision_score(y_test, predicted, zero_division=0)), 'recall': float(recall_score(y_test, predicted, zero_division=0)), 'f1': float(f1_score(y_test, predicted, zero_division=0)), 'roc_auc': float(roc_auc_score(y_test, probabilities))}
    publishable = metrics['recall'] >= 0.2 and metrics['roc_auc'] >= 0.6
    print(json.dumps({'train_samples': len(train), 'test_samples': len(test), 'contract': FEATURE_CONTRACT, 'metrics': metrics, 'published': False, 'publishable': publishable}, indent=2))
    if dry_run:
        return metrics
    if not publishable:
        raise ValueError('Candidate failed publication gate: recall >= 0.20 and ROC AUC >= 0.60 required')
    version = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S') + '-' + uuid4().hex[:12]
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    target = MODEL_DIR / f'{version}.joblib'
    temporary = MODEL_DIR / f'{version}.tmp'
    def publish(model_id):
        bundle = {'model': model, 'model_id': model_id, 'version': version, 'feature_columns': FEATURE_COLUMNS, 'feature_contract': FEATURE_CONTRACT}
        joblib.dump(bundle, temporary)
        loaded = joblib.load(temporary)
        loaded['model'].predict_proba(X_test[:1])
        os.replace(temporary, target)
        return str(target.resolve())
    try:
        db.record_training_run(version, metrics, train, test, publish)
    except Exception:
        temporary.unlink(missing_ok=True)
        target.unlink(missing_ok=True)
        raise
    return metrics


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true', help='Fit/evaluate in memory; do not write artifacts or database')
    args = parser.parse_args()
    try:
        main(args.dry_run)
    except Exception as exc:
        print(f'Training stopped: {type(exc).__name__}: {exc}', file=sys.stderr)
        sys.exit(1)
