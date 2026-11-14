"""Event-based training/serving and transactional model publication."""
from datetime import datetime, timedelta, timezone
from config import FEATURE_COLUMNS, FEATURE_CONTRACT
from sqlserver_dbapi import connect as _connect
from ml.features import ORDERS_SQL, HISTORY_SQL, HORIZON_DAYS, features_at, future_label, snapshot_cutoff, timelines



def load_training_records():
    with _connect() as conn, conn.cursor() as cur:
        cur.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
        cur.execute(ORDERS_SQL)
        orders = cur.fetchall()
        cur.execute(HISTORY_SQL)
        events = cur.fetchall()
        cur.execute('SELECT buyer_id, feature_date FROM buyer_features ORDER BY feature_date, buyer_id')
        snapshots = cur.fetchall()
    buyers = timelines(orders, events)
    observed = [event['created_at'] for event in events] + [order['created_at'] for order in orders]
    if not observed:
        raise ValueError('No observed order events for supervised training')
    observed_until = min(max(observed), datetime.now(timezone.utc))
    records = []
    for snapshot in snapshots:
        cutoff = snapshot_cutoff(snapshot['feature_date'])
        if cutoff + timedelta(days=HORIZON_DAYS) > observed_until:
            continue  # outcomes have not matured; never label censored windows as clean
        buyer_id = str(snapshot['buyer_id'])
        history = buyers.get(buyer_id, [])
        feature = features_at(history, cutoff)
        if feature['total_orders'] < 3 or feature['observed_outcomes'] == 0:
            continue
        records.append({'buyer_id': buyer_id, 'cutoff': cutoff,
                        'features': [float(feature[column]) for column in FEATURE_COLUMNS],
                        'target': future_label(history, cutoff)})
    return records


def load_buyer_features(buyer_id):
    with _connect() as conn, conn.cursor() as cur:
        cur.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
        query = ORDERS_SQL.replace('ORDER BY o.created_at, o.id', 'WHERE o.buyer_id = ? ORDER BY o.created_at, o.id')
        cur.execute(query, (buyer_id,))
        orders = cur.fetchall()
        cur.execute('SELECT h.id, h.order_id, h.new_status, h.created_at FROM order_status_history h JOIN orders o ON o.id = h.order_id WHERE o.buyer_id = ? ORDER BY h.created_at, h.id', (buyer_id,))
        events = cur.fetchall()
    history = timelines(orders, events).get(str(buyer_id), [])
    features = features_at(history, datetime.now(timezone.utc))
    return features if features['total_orders'] >= 3 and features['observed_outcomes'] > 0 else None


def get_active_model():
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT TOP (1) id, version, model_path FROM ml_models WHERE model_name = 'risk_classifier' AND is_active = 1 ORDER BY created_at DESC")
        return cur.fetchone()


def write_prediction(result):
    with _connect() as conn, conn.cursor() as cur:
        if result.get('order_id') is not None:
            cur.execute('SELECT id FROM orders WHERE id = ? AND buyer_id = ?', (result['order_id'], result['buyer_id']))
            if cur.fetchone() is None:
                raise ValueError('Order does not belong to buyer')
        cur.execute('INSERT INTO risk_predictions (buyer_id, order_id, model_id, risk_probability, risk_score, risk_level) OUTPUT inserted.id VALUES (?,?,?,?,?,?)',
                    (result['buyer_id'], result.get('order_id'), result['model_id'], result['risk_probability'], result['risk_score'], result['risk_level']))
        prediction_id = cur.fetchone()['id']
        for exp in result['explanations']:
            cur.execute('INSERT INTO risk_explanations (prediction_id, feature_name, feature_value, impact_value, impact_direction, description) VALUES (?,?,?,?,?,?)',
                        (prediction_id, exp['feature_name'], exp['feature_value'], None, 'NEUTRAL', exp['description']))
        recommendation = None
        if result['risk_level'] in ('HIGH', 'CRITICAL'):
            action = 'BLOCK_BUYER' if result['risk_level'] == 'CRITICAL' else 'REQUIRE_PREPAYMENT'
            title = 'Kiểm tra buyer trước khi xử lý đơn hàng'
            cur.execute('INSERT INTO recommendations (prediction_id, action_type, title, description) OUTPUT inserted.id VALUES (?,?,?,?)',
                        (prediction_id, action, title, f"Model risk_classifier {result['model_version']}: {result['risk_score']}/100"))
            recommendation = {'id': cur.fetchone()['id'], 'action_type': action, 'title': title}
    prediction = {'id': prediction_id, 'buyer_id': result['buyer_id'], 'order_id': result.get('order_id'), 'model_id': result['model_id'],
                  'risk_probability': result['risk_probability'], 'risk_score': result['risk_score'], 'risk_level': result['risk_level'], 'risk_explanations': result['explanations']}
    return {'prediction': prediction, 'recommendation': recommendation}


def record_training_run(version, metrics, train, test, publish):
    # The previous active artifact remains available until this transaction commits.
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("EXEC sp_getapplock @Resource='risk_classifier', @LockMode='Exclusive', @LockOwner='Session', @LockTimeout=10000")
        cur.execute("INSERT INTO ml_models (model_name, algorithm, version, accuracy, precision_score, recall_score, f1_score, roc_auc, is_active) OUTPUT inserted.id VALUES ('risk_classifier','GradientBoostingClassifier',?,?,?,?,?,?,0)",
                    (version, metrics['accuracy'], metrics['precision'], metrics['recall'], metrics['f1'], metrics['roc_auc']))
        model_id = cur.fetchone()['id']
        model_path = publish(model_id)
        cur.execute("INSERT INTO ml_training_runs (model_id,dataset_version,feature_date_from,feature_date_to,training_samples,testing_samples,started_at,completed_at,status) VALUES (?,?,?,?,?,?,SYSUTCDATETIME(),SYSUTCDATETIME(),'SUCCESS')",
                    (model_id, FEATURE_CONTRACT, min(row['cutoff'] for row in train).date(), max(row['cutoff'] for row in test).date(), len(train), len(test)))
        cur.execute("UPDATE ml_models SET is_active = 0 WHERE model_name = 'risk_classifier' AND is_active = 1")
        cur.execute('UPDATE ml_models SET is_active = 1, model_path = ? WHERE id = ?', (model_path, model_id))
    return model_id
