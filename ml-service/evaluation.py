"""Disjoint buyers, forward holdout and a label-horizon embargo."""
import hashlib
from datetime import timedelta
from ml.features import HORIZON_DAYS


def split_records(records):
    buyers = sorted({row['buyer_id'] for row in records}, key=lambda value: hashlib.sha256(value.encode()).hexdigest())
    dates = sorted({row['cutoff'] for row in records})
    if len(buyers) < 5 or len(dates) < 3:
        raise ValueError('Need at least 5 buyers and 3 snapshot dates for holdout evaluation')
    heldout = set(buyers[-max(1, len(buyers) // 5):])
    split_at = dates[min(len(dates) - 1, max(1, int(len(dates) * 0.8)))]
    train = [row for row in records if row['buyer_id'] not in heldout and row['cutoff'] + timedelta(days=HORIZON_DAYS) <= split_at]
    test = [row for row in records if row['buyer_id'] in heldout and row['cutoff'] >= split_at]
    if len(train) < 20 or len(test) < 10 or len({row['target'] for row in train}) < 2 or len({row['target'] for row in test}) < 2:
        raise ValueError('Insufficient mature samples or outcome classes in temporal/buyer holdout; no model published')
    return train, test
