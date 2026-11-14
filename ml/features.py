"""Point-in-time features shared by exports, training and Python serving.

Status is reconstructed from events. Current order/profile status is never
copied into a historical snapshot. Cutoffs are exclusive.
"""
from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta, timezone

FEATURE_COLUMNS = [
    'cancel_rate', 'return_rate', 'failure_rate', 'non_receive_rate',
    'total_order_value', 'average_order_value', 'orders_last_7_days',
    'orders_last_30_days', 'avg_order_interval',
]
FEATURE_CONTRACT = 'buyer-events-v2'
HORIZON_DAYS = 14
VN_TZ = timezone(timedelta(hours=7))
BAD_STATUSES = {'CANCELLED', 'RETURNED', 'FAILED', 'NON_RECEIVED'}
ORDERS_SQL = """
    SELECT o.id, o.buyer_id, o.total_amount, o.created_at,
           (SELECT MIN(p.paid_at) FROM payments p WHERE p.order_id = o.id) AS paid_at
    FROM orders o ORDER BY o.created_at, o.id
"""
HISTORY_SQL = 'SELECT id, order_id, new_status, created_at FROM order_status_history ORDER BY created_at, id'


def as_utc(value):
    if isinstance(value, str):
        value = datetime.fromisoformat(value)
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def snapshot_cutoff(value: date) -> datetime:
    return datetime.combine(value + timedelta(days=1), time.min, VN_TZ).astimezone(timezone.utc)


def timelines(orders, events):
    history = defaultdict(list)
    for event in sorted(events, key=lambda e: (as_utc(e['created_at']), e['id'])):
        history[str(event['order_id'])].append((as_utc(event['created_at']), event['new_status']))
    buyers = defaultdict(list)
    for order in sorted(orders, key=lambda o: as_utc(o['created_at'])):
        buyers[str(order['buyer_id'])].append({
            'created_at': as_utc(order['created_at']),
            'total_amount': float(order['total_amount']),
            'paid_at': as_utc(order['paid_at']) if order.get('paid_at') else None,
            'events': history[str(order['id'])],
        })
    return buyers


def features_at(orders, cutoff):
    cutoff = as_utc(cutoff)
    visible = [order for order in orders if order['created_at'] < cutoff]
    counts = Counter()
    spent = 0.0
    for order in visible:
        status = 'PENDING'
        for event_at, new_status in order['events']:
            if event_at >= cutoff:
                break
            status = new_status
        counts[status] += 1
        if status in {'COMPLETED', 'DELIVERED'} and order['paid_at'] and order['paid_at'] < cutoff:
            spent += order['total_amount']
    total = len(visible)
    denominator = max(total, 1)
    gaps = [(b['created_at'] - a['created_at']).total_seconds() / 86400 for a, b in zip(visible, visible[1:])]
    return {
        'cancel_rate': counts['CANCELLED'] / denominator,
        'return_rate': counts['RETURNED'] / denominator,
        'failure_rate': counts['FAILED'] / denominator,
        'non_receive_rate': counts['NON_RECEIVED'] / denominator,
        'total_order_value': round(spent, 2),
        'average_order_value': round(sum(o['total_amount'] for o in visible) / denominator, 2),
        'orders_last_7_days': sum(o['created_at'] >= cutoff - timedelta(days=7) for o in visible),
        'orders_last_30_days': sum(o['created_at'] >= cutoff - timedelta(days=30) for o in visible),
        'avg_order_interval': round(sum(gaps) / len(gaps), 2) if gaps else 0.0,
        'total_orders': total,
        'observed_outcomes': sum(counts[status] for status in BAD_STATUSES | {'COMPLETED', 'DELIVERED'}),
        'completed_rate': counts['COMPLETED'] / denominator,
    }


def future_label(orders, cutoff):
    end = cutoff + timedelta(days=HORIZON_DAYS)
    return int(any(cutoff <= at < end and status in BAD_STATUSES for order in orders for at, status in order['events']))
