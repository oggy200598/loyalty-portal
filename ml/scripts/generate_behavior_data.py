"""Generate realistic buyer behavior data for RiskMind AI.

Phase scope:
- Creates demo buyers, addresses, orders, order_items, payments, shipments,
  returns, buyer_profiles, and buyer_features.
- Uses existing shops/products/categories/product_variants.
- Exports the feature dataset for later ML work.
- Does NOT train a model, create labels, create risk scores, call Gemini, or
  insert fake risk_predictions.

Usage:
    python ml/scripts/generate_behavior_data.py --reset
    python ml/scripts/generate_behavior_data.py --reset --seed 12345
"""
from __future__ import annotations

import argparse
import math
import random
import sys
import uuid
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any

import pandas as pd
from sqlalchemy import create_engine, text

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.config import BUYER_RISK_CSV, BUYER_RISK_PARQUET, DATA_DIR, get_database_url
from ml.features import FEATURE_COLUMNS, ORDERS_SQL, HISTORY_SQL, features_at, snapshot_cutoff, timelines

SEED = 20260826
BUYER_EMAIL_PREFIX = "behavior_buyer_"
BUYER_EMAIL_DOMAIN = "riskmind.local"
ORDER_CODE_PREFIX = "RMBEH"
DEMO_PASSWORD_HASH = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
VN_TZ = timezone(timedelta(hours=7))

DATASET_COLUMNS = ['buyer_id', 'feature_date'] + FEATURE_COLUMNS + ['account_age_days', 'total_orders', 'completed_rate']


@dataclass(frozen=True)
class BehaviorProfile:
    name: str
    buyer_weight: float
    order_weight: float
    bursty: bool
    status_weights: dict[str, float]
    payment_failure_bias: float
    max_recent_orders: int


PROFILES = [
    BehaviorProfile(
        "NORMAL",
        0.45,
        5.5,
        False,
        {
            "COMPLETED": 0.65,
            "DELIVERED": 0.25,
            "CANCELLED": 0.035,
            "RETURNED": 0.025,
            "FAILED": 0.015,
            "NON_RECEIVED": 0.01,
            "SHIPPING": 0.01,
        },
        0.015,
        2,
    ),
    BehaviorProfile(
        "ACTIVE",
        0.20,
        13.0,
        False,
        {
            "COMPLETED": 0.70,
            "DELIVERED": 0.22,
            "CANCELLED": 0.025,
            "RETURNED": 0.025,
            "FAILED": 0.01,
            "NON_RECEIVED": 0.01,
            "SHIPPING": 0.01,
        },
        0.01,
        4,
    ),
    BehaviorProfile(
        "UNSTABLE",
        0.18,
        8.0,
        False,
        {
            "COMPLETED": 0.50,
            "DELIVERED": 0.20,
            "CANCELLED": 0.14,
            "RETURNED": 0.06,
            "FAILED": 0.055,
            "NON_RECEIVED": 0.035,
            "SHIPPING": 0.01,
        },
        0.07,
        5,
    ),
    BehaviorProfile(
        "UNUSUAL",
        0.12,
        11.0,
        True,
        {
            "COMPLETED": 0.38,
            "DELIVERED": 0.17,
            "CANCELLED": 0.20,
            "RETURNED": 0.06,
            "FAILED": 0.10,
            "NON_RECEIVED": 0.08,
            "SHIPPING": 0.01,
        },
        0.15,
        9,
    ),
    BehaviorProfile(
        "EXTREME",
        0.05,
        18.0,
        True,
        {
            "COMPLETED": 0.22,
            "DELIVERED": 0.10,
            "CANCELLED": 0.27,
            "RETURNED": 0.07,
            "FAILED": 0.18,
            "NON_RECEIVED": 0.15,
            "SHIPPING": 0.01,
        },
        0.30,
        15,
    ),
]

PROVINCES = [
    ("TP. Ho Chi Minh", "Quan 1", "Ben Nghe"),
    ("TP. Ho Chi Minh", "Quan 3", "Vo Thi Sau"),
    ("TP. Ho Chi Minh", "Tan Binh", "Phuong 2"),
    ("Ha Noi", "Cau Giay", "Dich Vong"),
    ("Ha Noi", "Dong Da", "Lang Ha"),
    ("Da Nang", "Hai Chau", "Thach Thang"),
    ("Binh Duong", "Thu Dau Mot", "Phu Cuong"),
    ("Dong Nai", "Bien Hoa", "Tan Hiep"),
    ("Can Tho", "Ninh Kieu", "An Khanh"),
    ("Hai Phong", "Le Chan", "Du Hang"),
]

FIRST_NAMES = [
    "An",
    "Bao",
    "Chi",
    "Dung",
    "Giang",
    "Ha",
    "Hieu",
    "Khanh",
    "Lan",
    "Linh",
    "Minh",
    "Nam",
    "Ngoc",
    "Phuc",
    "Quan",
    "Thao",
    "Trang",
    "Tuan",
    "Vy",
    "Yen",
]
LAST_NAMES = ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Phan", "Vu", "Vo", "Dang", "Bui"]
PAYMENT_METHODS = ["COD", "BANK_TRANSFER", "CREDIT_CARD", "E_WALLET"]
RETURN_REASONS = [
    "buyer no longer wants",
    "ordered by mistake",
    "wrong item",
    "damaged",
    "missing part",
    "not as described",
]
CARRIERS = ["GHN", "GHTK", "J&T", "Viettel Post", "Ninja Van"]


def money(value: Any) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def rate(value: float) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.00001"), rounding=ROUND_HALF_UP)


def weighted_choice(rng: random.Random, pairs: list[tuple[Any, float]]) -> Any:
    total = sum(weight for _, weight in pairs)
    point = rng.random() * total
    cumulative = 0.0
    for value, weight in pairs:
        cumulative += weight
        if point <= cumulative:
            return value
    return pairs[-1][0]


def random_datetime(rng: random.Random, day: date) -> datetime:
    return datetime.combine(
        day,
        time(
            hour=rng.randint(7, 23),
            minute=rng.randint(0, 59),
            second=rng.randint(0, 59),
        ),
        tzinfo=VN_TZ,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate RiskMind AI buyer behavior data.")
    parser.add_argument("--reset", action="store_true", help="Delete data previously generated by this script first.")
    parser.add_argument("--seed", type=int, default=SEED, help=f"Random seed. Default: {SEED}")
    parser.add_argument("--buyers", type=int, default=150, help="Number of demo buyers to create (100-200 recommended).")
    parser.add_argument("--orders", type=int, default=1000, help="Approximate number of demo orders.")
    parser.add_argument("--as-of", type=str, default=date.today().isoformat(), help="Feature/data end date (YYYY-MM-DD).")
    return parser.parse_args()


def get_role_id(conn) -> int:
    role_id = conn.execute(text("SELECT id FROM roles WHERE name = 'BUYER'")).scalar()
    if role_id is not None:
        return int(role_id)
    return int(conn.execute(text("INSERT INTO roles(name) VALUES ('BUYER') RETURNING id")).scalar_one())


def reset_demo_data(conn) -> None:
    buyer_filter = f"{BUYER_EMAIL_PREFIX}%@{BUYER_EMAIL_DOMAIN}"
    order_filter = f"{ORDER_CODE_PREFIX}-%"

    conn.execute(
        text(
            """
            DELETE FROM recommendation_actions
            WHERE recommendation_id IN (
                SELECT r.id
                FROM recommendations r
                JOIN risk_predictions rp ON rp.id = r.prediction_id
                LEFT JOIN orders o ON o.id = rp.order_id
                LEFT JOIN users u ON u.id = rp.buyer_id
                WHERE o.order_code LIKE :order_filter OR u.email LIKE :buyer_filter
            )
            """
        ),
        {"order_filter": order_filter, "buyer_filter": buyer_filter},
    )
    conn.execute(
        text(
            """
            DELETE FROM recommendations
            WHERE prediction_id IN (
                SELECT rp.id
                FROM risk_predictions rp
                LEFT JOIN orders o ON o.id = rp.order_id
                LEFT JOIN users u ON u.id = rp.buyer_id
                WHERE o.order_code LIKE :order_filter OR u.email LIKE :buyer_filter
            )
            """
        ),
        {"order_filter": order_filter, "buyer_filter": buyer_filter},
    )
    conn.execute(
        text(
            """
            DELETE FROM risk_explanations
            WHERE prediction_id IN (
                SELECT rp.id
                FROM risk_predictions rp
                LEFT JOIN orders o ON o.id = rp.order_id
                LEFT JOIN users u ON u.id = rp.buyer_id
                WHERE o.order_code LIKE :order_filter OR u.email LIKE :buyer_filter
            )
            """
        ),
        {"order_filter": order_filter, "buyer_filter": buyer_filter},
    )
    conn.execute(
        text(
            """
            DELETE FROM risk_predictions
            WHERE id IN (
                SELECT rp.id
                FROM risk_predictions rp
                LEFT JOIN orders o ON o.id = rp.order_id
                LEFT JOIN users u ON u.id = rp.buyer_id
                WHERE o.order_code LIKE :order_filter OR u.email LIKE :buyer_filter
            )
            """
        ),
        {"order_filter": order_filter, "buyer_filter": buyer_filter},
    )

    for table_name in (
        "reviews",
        "returns",
        "shipments",
        "payments",
        "order_status_history",
        "order_items",
    ):
        conn.execute(
            text(
                f"""
                DELETE FROM {table_name}
                WHERE order_id IN (SELECT id FROM orders WHERE order_code LIKE :order_filter)
                """
            ),
            {"order_filter": order_filter},
        )

    conn.execute(text("DELETE FROM orders WHERE order_code LIKE :order_filter"), {"order_filter": order_filter})
    conn.execute(
        text(
            """
            DELETE FROM buyer_features
            WHERE buyer_id IN (SELECT id FROM users WHERE email LIKE :buyer_filter)
            """
        ),
        {"buyer_filter": buyer_filter},
    )
    conn.execute(
        text(
            """
            DELETE FROM buyer_profiles
            WHERE buyer_id IN (SELECT id FROM users WHERE email LIKE :buyer_filter)
            """
        ),
        {"buyer_filter": buyer_filter},
    )
    conn.execute(
        text(
            """
            DELETE FROM wishlist_items
            WHERE wishlist_id IN (
                SELECT w.id FROM wishlists w JOIN users u ON u.id = w.user_id WHERE u.email LIKE :buyer_filter
            )
            """
        ),
        {"buyer_filter": buyer_filter},
    )
    conn.execute(
        text(
            """
            DELETE FROM cart_items
            WHERE cart_id IN (
                SELECT c.id FROM carts c JOIN users u ON u.id = c.user_id WHERE u.email LIKE :buyer_filter
            )
            """
        ),
        {"buyer_filter": buyer_filter},
    )
    conn.execute(
        text(
            """
            DELETE FROM wishlists
            WHERE user_id IN (SELECT id FROM users WHERE email LIKE :buyer_filter)
            """
        ),
        {"buyer_filter": buyer_filter},
    )
    conn.execute(
        text(
            """
            DELETE FROM carts
            WHERE user_id IN (SELECT id FROM users WHERE email LIKE :buyer_filter)
            """
        ),
        {"buyer_filter": buyer_filter},
    )
    conn.execute(
        text(
            """
            DELETE FROM addresses
            WHERE user_id IN (SELECT id FROM users WHERE email LIKE :buyer_filter)
            """
        ),
        {"buyer_filter": buyer_filter},
    )
    conn.execute(
        text(
            """
            DELETE FROM user_roles
            WHERE user_id IN (SELECT id FROM users WHERE email LIKE :buyer_filter)
            """
        ),
        {"buyer_filter": buyer_filter},
    )
    conn.execute(text("DELETE FROM users WHERE email LIKE :buyer_filter"), {"buyer_filter": buyer_filter})


def load_catalog(conn) -> tuple[list[dict[str, Any]], dict[int, list[dict[str, Any]]], list[dict[str, Any]]]:
    shops = [dict(row._mapping) for row in conn.execute(text("SELECT id, owner_id, name FROM shops WHERE status = 'ACTIVE'"))]
    products = [
        dict(row._mapping)
        for row in conn.execute(
            text(
                """
                SELECT id, shop_id, category_id, name, price, stock_quantity
                FROM products
                WHERE status = 'ACTIVE' AND stock_quantity > 0
                ORDER BY id
                """
            )
        )
    ]
    variants = [
        dict(row._mapping)
        for row in conn.execute(
            text(
                """
                SELECT id, product_id, variant_name, price, stock_quantity
                FROM product_variants
                WHERE stock_quantity > 0
                ORDER BY id
                """
            )
        )
    ]
    categories_count = conn.execute(text("SELECT COUNT(*) FROM categories WHERE status = 'ACTIVE'")).scalar_one()
    if len(shops) < 1:
        raise RuntimeError("No active shops found. Run the ecommerce seed first.")
    if len(products) < 1:
        raise RuntimeError("No active products found. Run the catalog seed first.")
    if categories_count < 1:
        raise RuntimeError("No active categories found. Run the catalog seed first.")

    variants_by_product: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for variant in variants:
        variants_by_product[int(variant["product_id"])].append(variant)

    return shops, variants_by_product, products


def assign_profiles(rng: random.Random, buyer_count: int) -> list[BehaviorProfile]:
    raw_counts = [max(1, round(buyer_count * profile.buyer_weight)) for profile in PROFILES]
    while sum(raw_counts) > buyer_count:
        idx = max(range(len(raw_counts)), key=lambda i: raw_counts[i])
        raw_counts[idx] -= 1
    while sum(raw_counts) < buyer_count:
        idx = max(range(len(PROFILES)), key=lambda i: PROFILES[i].buyer_weight)
        raw_counts[idx] += 1

    assigned: list[BehaviorProfile] = []
    for profile, count in zip(PROFILES, raw_counts):
        assigned.extend([profile] * count)
    rng.shuffle(assigned)
    return assigned


def allocate_order_counts(rng: random.Random, profiles: list[BehaviorProfile], target_orders: int) -> list[int]:
    counts = []
    for profile in profiles:
        base = max(1, int(rng.gauss(profile.order_weight, max(1.2, profile.order_weight * 0.25))))
        counts.append(base)

    while sum(counts) < target_orders:
        weights = [(i, profiles[i].order_weight) for i in range(len(profiles))]
        counts[weighted_choice(rng, weights)] += 1
    while sum(counts) > target_orders:
        candidates = [(i, counts[i]) for i in range(len(counts)) if counts[i] > 1]
        counts[weighted_choice(rng, candidates)] -= 1
    return counts


def create_buyers(conn, rng: random.Random, buyer_count: int, as_of: date) -> list[dict[str, Any]]:
    buyer_role_id = get_role_id(conn)
    profiles = assign_profiles(rng, buyer_count)
    buyers: list[dict[str, Any]] = []

    for index, profile in enumerate(profiles, start=1):
        buyer_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"riskmind-behavior-buyer-{index}"))
        account_age = weighted_choice(rng, [(rng.randint(5, 30), 0.25), (rng.randint(31, 180), 0.45), (rng.randint(181, 700), 0.30)])
        created_day = as_of - timedelta(days=account_age)
        created_at = random_datetime(rng, created_day)
        full_name = f"{rng.choice(LAST_NAMES)} {rng.choice(FIRST_NAMES)} {rng.choice(FIRST_NAMES)}"
        phone = f"09{index % 100000000:08d}"
        email = f"{BUYER_EMAIL_PREFIX}{index:03d}@{BUYER_EMAIL_DOMAIN}"

        conn.execute(
            text(
                """
                INSERT INTO users(id, email, password_hash, full_name, phone, status, created_at, updated_at)
                VALUES (:id, :email, :password_hash, :full_name, :phone, 'ACTIVE', :created_at, :created_at)
                """
            ),
            {
                "id": buyer_id,
                "email": email,
                "password_hash": DEMO_PASSWORD_HASH,
                "full_name": full_name,
                "phone": phone,
                "created_at": created_at,
            },
        )
        conn.execute(
            text("INSERT INTO user_roles(user_id, role_id) VALUES (:user_id, :role_id) ON CONFLICT DO NOTHING"),
            {"user_id": buyer_id, "role_id": buyer_role_id},
        )

        address_count = weighted_choice(rng, [(1, 0.68), (2, 0.24), (3, 0.08)])
        addresses = []
        for address_index in range(address_count):
            province, district, ward = rng.choice(PROVINCES)
            address_detail = f"{rng.randint(1, 220)} Demo Street {address_index + 1}"
            address_id = conn.execute(
                text(
                    """
                    INSERT INTO addresses(
                        user_id, receiver_name, phone, province, district, ward,
                        address_detail, is_default, created_at
                    )
                    VALUES (
                        :user_id, :receiver_name, :phone, :province, :district, :ward,
                        :address_detail, :is_default, :created_at
                    )
                    RETURNING id
                    """
                ),
                {
                    "user_id": buyer_id,
                    "receiver_name": full_name,
                    "phone": phone,
                    "province": province,
                    "district": district,
                    "ward": ward,
                    "address_detail": address_detail,
                    "is_default": address_index == 0,
                    "created_at": created_at + timedelta(days=address_index),
                },
            ).scalar_one()
            addresses.append(
                {
                    "id": int(address_id),
                    "receiver_name": full_name,
                    "phone": phone,
                    "province": province,
                    "district": district,
                    "ward": ward,
                    "address_detail": address_detail,
                }
            )

        buyers.append(
            {
                "id": buyer_id,
                "email": email,
                "full_name": full_name,
                "phone": phone,
                "created_at": created_at,
                "profile": profile,
                "addresses": addresses,
            }
        )

    return buyers


def prepare_weighted_catalog(products: list[dict[str, Any]]) -> dict[int, list[tuple[dict[str, Any], float]]]:
    products_by_shop: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for product in products:
        products_by_shop[int(product["shop_id"])].append(product)

    weighted_by_shop: dict[int, list[tuple[dict[str, Any], float]]] = {}
    for shop_id, shop_products in products_by_shop.items():
        count = len(shop_products)
        weighted = []
        for index, product in enumerate(shop_products):
            rank = index / max(count - 1, 1)
            if rank < 0.20:
                weight = 8.0
            elif rank < 0.70:
                weight = 3.0
            else:
                weight = 0.9
            weighted.append((product, weight))
        weighted_by_shop[shop_id] = weighted
    return weighted_by_shop


def create_order_dates(rng: random.Random, buyer: dict[str, Any], order_count: int, as_of: date) -> list[datetime]:
    profile: BehaviorProfile = buyer["profile"]
    start_day = max(buyer["created_at"].date() + timedelta(days=1), as_of - timedelta(days=rng.randint(90, 180)))
    if start_day > as_of:
        start_day = as_of - timedelta(days=1)

    if profile.bursty:
        burst_count = rng.randint(2, min(4, max(2, order_count)))
        centers = [start_day + timedelta(days=rng.randint(0, max(1, (as_of - start_day).days))) for _ in range(burst_count)]
        days = []
        for _ in range(order_count):
            center = rng.choice(centers)
            offset = rng.choice([0, 0, 1, 1, 2, -1])
            day = min(as_of, max(start_day, center + timedelta(days=offset)))
            days.append(day)
    else:
        span = max(1, (as_of - start_day).days)
        interval = span / max(order_count, 1)
        days = []
        for i in range(order_count):
            jitter = rng.gauss(0, interval * 0.45)
            offset = int(max(0, min(span, i * interval + jitter)))
            days.append(start_day + timedelta(days=offset))

    recent_extra = min(profile.max_recent_orders, max(0, order_count // 5))
    for _ in range(rng.randint(0, recent_extra)):
        days[rng.randrange(len(days))] = as_of - timedelta(days=rng.randint(0, 6))

    return sorted(random_datetime(rng, day) for day in days)


def payment_for_status(rng: random.Random, status: str, profile: BehaviorProfile) -> tuple[str, str, datetime | None]:
    method = weighted_choice(rng, [("COD", 0.38), ("E_WALLET", 0.25), ("CREDIT_CARD", 0.22), ("BANK_TRANSFER", 0.15)])
    if status == "FAILED":
        return method, "FAILED", None
    if status == "CANCELLED":
        return method, weighted_choice(rng, [("UNPAID", 0.70), ("REFUNDED", 0.25), ("FAILED", 0.05)]), None
    if status == "RETURNED":
        return method, weighted_choice(rng, [("REFUNDED", 0.70), ("PARTIALLY_REFUNDED", 0.30)]), None
    if rng.random() < profile.payment_failure_bias and status not in ("COMPLETED", "DELIVERED"):
        return method, "FAILED", None
    if status in ("PENDING", "CONFIRMED", "PROCESSING"):
        pay_status = weighted_choice(rng, [("UNPAID", 0.55), ("PAID", 0.45)])
    else:
        pay_status = "PAID"
    return method, pay_status, None


def shipment_status_for_order(status: str) -> str | None:
    mapping = {
        "PENDING": None,
        "CONFIRMED": "PENDING",
        "PROCESSING": "PICKED_UP",
        "SHIPPING": "IN_TRANSIT",
        "DELIVERED": "DELIVERED",
        "COMPLETED": "DELIVERED",
        "CANCELLED": None,
        "FAILED": "FAILED_DELIVERY",
        "NON_RECEIVED": "FAILED_DELIVERY",
        "RETURNED": "RETURNED_TO_SHOP",
    }
    return mapping[status]


def create_orders(
    conn,
    rng: random.Random,
    buyers: list[dict[str, Any]],
    order_counts: list[int],
    shops: list[dict[str, Any]],
    products_by_shop: dict[int, list[tuple[dict[str, Any], float]]],
    variants_by_product: dict[int, list[dict[str, Any]]],
    as_of: date,
) -> dict[str, int]:
    shop_weights = []
    for index, shop in enumerate(sorted(shops, key=lambda s: int(s["id"]))):
        if int(shop["id"]) in products_by_shop:
            shop_weights.append((shop, 6.0 if index < max(1, len(shops) * 0.25) else 2.5 if index < max(1, len(shops) * 0.75) else 1.0))
    if not shop_weights:
        raise RuntimeError("No active shop has active products.")

    counters: Counter[str] = Counter()
    order_seq = 0

    for buyer, order_count in zip(buyers, order_counts):
        profile: BehaviorProfile = buyer["profile"]
        order_dates = create_order_dates(rng, buyer, order_count, as_of)

        for created_at in order_dates:
            order_seq += 1
            shop = weighted_choice(rng, shop_weights)
            shop_id = int(shop["id"])
            item_count = weighted_choice(rng, [(1, 0.58), (2, 0.28), (3, 0.10), (4, 0.04)])
            chosen: list[dict[str, Any]] = []
            used_products: set[int] = set()
            for _ in range(item_count):
                available = [(p, w) for p, w in products_by_shop[shop_id] if int(p["id"]) not in used_products]
                if not available:
                    break
                product = weighted_choice(rng, available)
                used_products.add(int(product["id"]))
                variants = variants_by_product.get(int(product["id"]), [])
                variant = rng.choice(variants) if variants and rng.random() < 0.75 else None
                unit_price = money(variant["price"] if variant else product["price"])
                stock = int(variant["stock_quantity"] if variant else product["stock_quantity"])
                quantity_limit = max(1, min(4, stock))
                quantity = weighted_choice(rng, [(1, 0.72), (2, 0.20), (3, 0.06), (4, 0.02)])
                quantity = min(int(quantity), quantity_limit)
                subtotal = unit_price * quantity
                chosen.append(
                    {
                        "product": product,
                        "variant": variant,
                        "quantity": quantity,
                        "unit_price": unit_price,
                        "subtotal": subtotal,
                    }
                )

            subtotal = money(sum((item["subtotal"] for item in chosen), Decimal("0.00")))
            shipping_fee = money(weighted_choice(rng, [(0, 0.18), (25000, 0.32), (30000, 0.30), (45000, 0.15), (60000, 0.05)]))
            discount = money(0)
            if subtotal >= Decimal("1000000") and rng.random() < 0.22:
                discount = min(money(subtotal * Decimal(str(rng.choice([0.03, 0.05, 0.08])))), Decimal("150000.00"))
            total = money(subtotal + shipping_fee - discount)
            status = weighted_choice(rng, list(profile.status_weights.items()))
            payment_method, payment_status, paid_at = payment_for_status(rng, status, profile)
            if payment_status in ("PAID", "REFUNDED", "PARTIALLY_REFUNDED"):
                paid_at = created_at + timedelta(minutes=rng.randint(2, 180))
            address = rng.choice(buyer["addresses"])
            updated_at = created_at + timedelta(days=rng.randint(0, 6), hours=rng.randint(0, 12))
            order_code = f"{ORDER_CODE_PREFIX}-{created_at:%Y%m%d}-{order_seq:06d}"

            order_id = conn.execute(
                text(
                    """
                    INSERT INTO orders(
                        order_code, buyer_id, shop_id, shipping_address_id,
                        shipping_receiver_name, shipping_phone, shipping_province,
                        shipping_district, shipping_ward, shipping_address_detail,
                        subtotal, shipping_fee, discount_amount, total_amount,
                        status, payment_status, created_at, updated_at
                    )
                    VALUES (
                        :order_code, :buyer_id, :shop_id, :shipping_address_id,
                        :shipping_receiver_name, :shipping_phone, :shipping_province,
                        :shipping_district, :shipping_ward, :shipping_address_detail,
                        :subtotal, :shipping_fee, :discount_amount, :total_amount,
                        :status, :payment_status, :created_at, :updated_at
                    )
                    RETURNING id
                    """
                ),
                {
                    "order_code": order_code,
                    "buyer_id": buyer["id"],
                    "shop_id": shop_id,
                    "shipping_address_id": address["id"],
                    "shipping_receiver_name": address["receiver_name"],
                    "shipping_phone": address["phone"],
                    "shipping_province": address["province"],
                    "shipping_district": address["district"],
                    "shipping_ward": address["ward"],
                    "shipping_address_detail": address["address_detail"],
                    "subtotal": subtotal,
                    "shipping_fee": shipping_fee,
                    "discount_amount": discount,
                    "total_amount": total,
                    "status": status,
                    "payment_status": payment_status,
                    "created_at": created_at,
                    "updated_at": updated_at,
                },
            ).scalar_one()

            for item in chosen:
                product = item["product"]
                variant = item["variant"]
                conn.execute(
                    text(
                        """
                        INSERT INTO order_items(
                            order_id, product_id, variant_id, product_name,
                            quantity, unit_price, subtotal
                        )
                        VALUES (
                            :order_id, :product_id, :variant_id, :product_name,
                            :quantity, :unit_price, :subtotal
                        )
                        """
                    ),
                    {
                        "order_id": order_id,
                        "product_id": product["id"],
                        "variant_id": variant["id"] if variant else None,
                        "product_name": product["name"],
                        "quantity": item["quantity"],
                        "unit_price": item["unit_price"],
                        "subtotal": item["subtotal"],
                    },
                )
                counters["order_items"] += 1

            conn.execute(
                text(
                    """
                    INSERT INTO payments(order_id, method, amount, status, transaction_code, paid_at)
                    VALUES (:order_id, :method, :amount, :status, :transaction_code, :paid_at)
                    """
                ),
                {
                    "order_id": order_id,
                    "method": payment_method,
                    "amount": total,
                    "status": payment_status,
                    "transaction_code": None if payment_status in ("UNPAID", "FAILED") else f"PAY-BEH-{order_seq:06d}",
                    "paid_at": paid_at,
                },
            )
            counters["payments"] += 1

            old_status = None
            history_statuses = build_status_history(status)
            for history_index, history_status in enumerate(history_statuses):
                conn.execute(
                    text(
                        """
                        INSERT INTO order_status_history(order_id, old_status, new_status, changed_by, created_at)
                        VALUES (:order_id, :old_status, :new_status, :changed_by, :created_at)
                        """
                    ),
                    {
                        "order_id": order_id,
                        "old_status": old_status,
                        "new_status": history_status,
                        "changed_by": shop["owner_id"],
                        "created_at": created_at + timedelta(hours=history_index * 2),
                    },
                )
                old_status = history_status
                counters["status_history"] += 1

            shipment_status = shipment_status_for_order(status)
            if shipment_status:
                shipped_at = created_at + timedelta(days=1, hours=rng.randint(1, 12))
                delivered_at = shipped_at + timedelta(days=rng.randint(1, 5)) if shipment_status == "DELIVERED" else None
                conn.execute(
                    text(
                        """
                        INSERT INTO shipments(order_id, carrier, tracking_code, status, shipped_at, delivered_at)
                        VALUES (:order_id, :carrier, :tracking_code, :status, :shipped_at, :delivered_at)
                        """
                    ),
                    {
                        "order_id": order_id,
                        "carrier": rng.choice(CARRIERS),
                        "tracking_code": f"TRK-BEH-{order_seq:06d}",
                        "status": shipment_status,
                        "shipped_at": shipped_at,
                        "delivered_at": delivered_at,
                    },
                )
                counters["shipments"] += 1

            if status == "RETURNED" or (status in ("COMPLETED", "DELIVERED") and rng.random() < 0.015):
                requested_at = created_at + timedelta(days=rng.randint(3, 12))
                return_status = weighted_choice(rng, [("COMPLETED", 0.58), ("APPROVED", 0.20), ("REQUESTED", 0.12), ("REJECTED", 0.10)])
                processed_at = requested_at + timedelta(days=rng.randint(1, 5)) if return_status in ("COMPLETED", "APPROVED", "REJECTED") else None
                conn.execute(
                    text(
                        """
                        INSERT INTO returns(order_id, reason, status, requested_at, processed_at)
                        VALUES (:order_id, :reason, :status, :requested_at, :processed_at)
                        """
                    ),
                    {
                        "order_id": order_id,
                        "reason": rng.choice(RETURN_REASONS),
                        "status": return_status,
                        "requested_at": requested_at,
                        "processed_at": processed_at,
                    },
                )
                counters["returns"] += 1

            counters["orders"] += 1
            counters[status] += 1
            counters[f"payment_{payment_method}"] += 1
            counters[f"payment_status_{payment_status}"] += 1

    return dict(counters)


def build_status_history(status: str) -> list[str]:
    if status == "PENDING":
        return ["PENDING"]
    if status == "CONFIRMED":
        return ["PENDING", "CONFIRMED"]
    if status == "PROCESSING":
        return ["PENDING", "CONFIRMED", "PROCESSING"]
    if status == "SHIPPING":
        return ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPING"]
    if status == "DELIVERED":
        return ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPING", "DELIVERED"]
    if status == "COMPLETED":
        return ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPING", "DELIVERED", "COMPLETED"]
    if status in ("CANCELLED", "FAILED"):
        return ["PENDING", status]
    if status == "NON_RECEIVED":
        return ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPING", "NON_RECEIVED"]
    if status == "RETURNED":
        return ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPING", "DELIVERED", "RETURNED"]
    return [status]


def rebuild_buyer_profiles(conn) -> None:
    conn.execute(
        text(
            """
            INSERT INTO buyer_profiles (
                buyer_id, total_orders, completed_orders, cancelled_orders,
                returned_orders, failed_orders, non_received_orders, total_spent,
                average_order_value, first_order_at, last_order_at, updated_at
            )
            SELECT
                u.id,
                COUNT(o.id)::int,
                COUNT(*) FILTER (WHERE o.status IN ('COMPLETED', 'DELIVERED'))::int,
                COUNT(*) FILTER (WHERE o.status = 'CANCELLED')::int,
                COUNT(*) FILTER (WHERE o.status = 'RETURNED')::int,
                COUNT(*) FILTER (WHERE o.status = 'FAILED')::int,
                COUNT(*) FILTER (WHERE o.status = 'NON_RECEIVED')::int,
                COALESCE(SUM(o.total_amount) FILTER (
                    WHERE o.status IN ('COMPLETED', 'DELIVERED') AND o.payment_status = 'PAID'
                ), 0),
                COALESCE(AVG(o.total_amount), 0),
                MIN(o.created_at),
                MAX(o.created_at),
                NOW()
            FROM users u
            JOIN orders o ON o.buyer_id = u.id
            WHERE u.email LIKE :buyer_filter AND o.order_code LIKE :order_filter
            GROUP BY u.id
            ON CONFLICT (buyer_id) DO UPDATE SET
                total_orders = EXCLUDED.total_orders,
                completed_orders = EXCLUDED.completed_orders,
                cancelled_orders = EXCLUDED.cancelled_orders,
                returned_orders = EXCLUDED.returned_orders,
                failed_orders = EXCLUDED.failed_orders,
                non_received_orders = EXCLUDED.non_received_orders,
                total_spent = EXCLUDED.total_spent,
                average_order_value = EXCLUDED.average_order_value,
                first_order_at = EXCLUDED.first_order_at,
                last_order_at = EXCLUDED.last_order_at,
                updated_at = NOW()
            """
        ),
        {
            "buyer_filter": f"{BUYER_EMAIL_PREFIX}%@{BUYER_EMAIL_DOMAIN}",
            "order_filter": f"{ORDER_CODE_PREFIX}-%",
        },
    )


def create_feature_snapshots(conn, buyers: list[dict[str, Any]], as_of: date) -> int:
    conn.execute(
        text(
            """
            DELETE FROM buyer_features
            WHERE buyer_id IN (
                SELECT id FROM users WHERE email LIKE :buyer_filter
            )
            """
        ),
        {"buyer_filter": f"{BUYER_EMAIL_PREFIX}%@{BUYER_EMAIL_DOMAIN}"},
    )

    snapshot_count = 0
    for buyer in buyers:
        first_order_date = conn.execute(
            text("SELECT MIN(created_at)::date FROM orders WHERE buyer_id = :buyer_id AND order_code LIKE :order_filter"),
            {"buyer_id": buyer["id"], "order_filter": f"{ORDER_CODE_PREFIX}-%"},
        ).scalar_one()
        if first_order_date is None:
            continue

        current = first_order_date
        snapshot_dates = set()
        while current <= as_of:
            snapshot_dates.add(current)
            current += timedelta(days=7)
        snapshot_dates.add(as_of)

        for feature_date in sorted(snapshot_dates):
            features = compute_features_for_date(conn, buyer["id"], feature_date)
            conn.execute(
                text(
                    """
                    INSERT INTO buyer_features(
                        buyer_id, feature_date, cancel_rate, return_rate, failure_rate,
                        non_receive_rate, total_order_value, average_order_value,
                        orders_last_7_days, orders_last_30_days, avg_order_interval,
                        created_at
                    )
                    VALUES (
                        :buyer_id, :feature_date, :cancel_rate, :return_rate, :failure_rate,
                        :non_receive_rate, :total_order_value, :average_order_value,
                        :orders_last_7_days, :orders_last_30_days, :avg_order_interval,
                        NOW()
                    )
                    """
                ),
                {"buyer_id": buyer["id"], "feature_date": feature_date, **features},
            )
            snapshot_count += 1
    return snapshot_count


def compute_features_for_date(conn, buyer_id: str, feature_date: date) -> dict[str, Any]:
    query = ORDERS_SQL.replace('ORDER BY o.created_at, o.id', 'WHERE o.buyer_id = :buyer_id ORDER BY o.created_at, o.id')
    orders = conn.execute(text(query), {'buyer_id': buyer_id}).mappings().all()
    events = conn.execute(text('SELECT h.id, h.order_id, h.new_status, h.created_at FROM order_status_history h JOIN orders o ON o.id = h.order_id WHERE o.buyer_id = :buyer_id ORDER BY h.created_at, h.id'), {'buyer_id': buyer_id}).mappings().all()
    feature = features_at(timelines(orders, events).get(str(buyer_id), []), snapshot_cutoff(feature_date))
    return {column: feature[column] for column in FEATURE_COLUMNS}


def validate_generated_data(conn) -> None:
    params = {
        "buyer_filter": f"{BUYER_EMAIL_PREFIX}%@{BUYER_EMAIL_DOMAIN}",
        "order_filter": f"{ORDER_CODE_PREFIX}-%",
    }
    checks = [
        (
            "orders reference missing buyers",
            """
            SELECT COUNT(*)
            FROM orders o
            LEFT JOIN users u ON u.id = o.buyer_id
            WHERE o.order_code LIKE :order_filter AND u.id IS NULL
            """,
        ),
        (
            "orders reference missing shops",
            """
            SELECT COUNT(*)
            FROM orders o
            LEFT JOIN shops s ON s.id = o.shop_id
            WHERE o.order_code LIKE :order_filter AND s.id IS NULL
            """,
        ),
        (
            "order_items reference missing products",
            """
            SELECT COUNT(*)
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            LEFT JOIN products p ON p.id = oi.product_id
            WHERE o.order_code LIKE :order_filter AND p.id IS NULL
            """,
        ),
        (
            "variants not belonging to item products",
            """
            SELECT COUNT(*)
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            LEFT JOIN product_variants pv ON pv.id = oi.variant_id
            WHERE o.order_code LIKE :order_filter
              AND oi.variant_id IS NOT NULL
              AND (pv.id IS NULL OR pv.product_id <> oi.product_id)
            """,
        ),
        (
            "orders without payment",
            """
            SELECT COUNT(*)
            FROM orders o
            LEFT JOIN payments p ON p.order_id = o.id
            WHERE o.order_code LIKE :order_filter
            GROUP BY o.id
            HAVING COUNT(p.id) <> 1
            """,
        ),
        (
            "orphan shipments",
            """
            SELECT COUNT(*)
            FROM shipments s
            LEFT JOIN orders o ON o.id = s.order_id
            WHERE s.tracking_code LIKE 'TRK-BEH-%' AND o.id IS NULL
            """,
        ),
        (
            "orphan returns",
            """
            SELECT COUNT(*)
            FROM returns r
            LEFT JOIN orders o ON o.id = r.order_id
            WHERE r.reason IN ('buyer no longer wants','ordered by mistake','wrong item','damaged','missing part','not as described')
              AND o.id IS NULL
            """,
        ),
        (
            "order totals mismatch",
            """
            SELECT COUNT(*)
            FROM orders o
            JOIN (
                SELECT order_id, SUM(subtotal) AS items_subtotal
                FROM order_items
                GROUP BY order_id
            ) oi ON oi.order_id = o.id
            WHERE o.order_code LIKE :order_filter
              AND ABS(o.subtotal - oi.items_subtotal) > 0.01
            """,
        ),
        (
            "invalid quantity or price",
            """
            SELECT COUNT(*)
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE o.order_code LIKE :order_filter
              AND (oi.quantity <= 0 OR oi.unit_price < 0 OR oi.subtotal < 0)
            """,
        ),
        (
            "negative product stock",
            "SELECT COUNT(*) FROM products WHERE stock_quantity < 0",
        ),
        (
            "feature rates outside [0,1]",
            """
            SELECT COUNT(*)
            FROM buyer_features bf
            JOIN users u ON u.id = bf.buyer_id
            WHERE u.email LIKE :buyer_filter
              AND (
                bf.cancel_rate < 0 OR bf.cancel_rate > 1 OR
                bf.return_rate < 0 OR bf.return_rate > 1 OR
                bf.failure_rate < 0 OR bf.failure_rate > 1 OR
                bf.non_receive_rate < 0 OR bf.non_receive_rate > 1
              )
            """,
        ),
        (
            "duplicate feature snapshots",
            """
            SELECT COUNT(*)
            FROM (
                SELECT bf.buyer_id, bf.feature_date, COUNT(*) AS n
                FROM buyer_features bf
                JOIN users u ON u.id = bf.buyer_id
                WHERE u.email LIKE :buyer_filter
                GROUP BY bf.buyer_id, bf.feature_date
                HAVING COUNT(*) > 1
            ) d
            """,
        ),
        (
            "risk predictions were generated",
            """
            SELECT COUNT(*)
            FROM risk_predictions rp
            JOIN users u ON u.id = rp.buyer_id
            WHERE u.email LIKE :buyer_filter
            """,
        ),
    ]

    for label, sql in checks:
        value = conn.execute(text(sql), params).scalar()
        if value is None:
            value = 0
        if int(value) != 0:
            raise RuntimeError(f"Validation failed: {label} ({value})")


def export_dataset(conn) -> pd.DataFrame:
    from ml.scripts.build_risk_dataset import build_snapshot_frame, clean_dataset, validate_dataset
    df = build_snapshot_frame(conn)
    df, _ = clean_dataset(df)
    validate_dataset(df)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    df.to_parquet(BUYER_RISK_PARQUET, index=False)
    df.to_csv(BUYER_RISK_CSV, index=False)
    return df


def print_summary(conn, counters: dict[str, int], feature_snapshots: int, df: pd.DataFrame) -> None:
    params = {
        "buyer_filter": f"{BUYER_EMAIL_PREFIX}%@{BUYER_EMAIL_DOMAIN}",
        "order_filter": f"{ORDER_CODE_PREFIX}-%",
    }
    summary = dict(
        conn.execute(
            text(
                """
                SELECT
                    (SELECT COUNT(*) FROM users WHERE email LIKE :buyer_filter) AS buyers,
                    (SELECT COUNT(*) FROM orders WHERE order_code LIKE :order_filter) AS orders,
                    (SELECT COUNT(*)
                     FROM order_items oi JOIN orders o ON o.id = oi.order_id
                     WHERE o.order_code LIKE :order_filter) AS order_items,
                    (SELECT COUNT(*)
                     FROM payments p JOIN orders o ON o.id = p.order_id
                     WHERE o.order_code LIKE :order_filter) AS payments,
                    (SELECT COUNT(*)
                     FROM shipments s JOIN orders o ON o.id = s.order_id
                     WHERE o.order_code LIKE :order_filter) AS shipments,
                    (SELECT COUNT(*)
                     FROM returns r JOIN orders o ON o.id = r.order_id
                     WHERE o.order_code LIKE :order_filter) AS returns,
                    (SELECT MIN(created_at)::date FROM orders WHERE order_code LIKE :order_filter) AS min_date,
                    (SELECT MAX(created_at)::date FROM orders WHERE order_code LIKE :order_filter) AS max_date
                """
            ),
            params,
        ).one()._mapping
    )
    statuses = Counter(
        {
            row._mapping["status"]: row._mapping["count"]
            for row in conn.execute(
                text(
                    """
                    SELECT status, COUNT(*)::int
                    FROM orders
                    WHERE order_code LIKE :order_filter
                    GROUP BY status
                    """
                ),
                params,
            )
        }
    )

    print()
    print("DATA GENERATION SUMMARY")
    print("=======================")
    print(f"Buyers:            {summary['buyers']}")
    print(f"Orders:            {summary['orders']}")
    print(f"Order Items:       {summary['order_items']}")
    print(f"Payments:          {summary['payments']}")
    print(f"Shipments:         {summary['shipments']}")
    print(f"Returns:           {summary['returns']}")
    print()
    print(f"Completed:         {statuses['COMPLETED']}")
    print(f"Delivered:         {statuses['DELIVERED']}")
    print(f"Cancelled:         {statuses['CANCELLED']}")
    print(f"Failed:            {statuses['FAILED']}")
    print(f"Non Received:      {statuses['NON_RECEIVED']}")
    print(f"Returned:          {statuses['RETURNED']}")
    print()
    print(f"Feature snapshots: {feature_snapshots}")
    print(f"Date range:        {summary['min_date']} -> {summary['max_date']}")
    print()
    print("Payment methods:")
    for key, value in sorted(counters.items()):
        if key.startswith("payment_") and not key.startswith("payment_status_"):
            print(f"  {key.removeprefix('payment_'):<14} {value}")
    print()
    print("Feature distributions:")
    for col in (
        "cancel_rate",
        "failure_rate",
        "non_receive_rate",
        "orders_last_7_days",
        "orders_last_30_days",
        "average_order_value",
        "avg_order_interval",
    ):
        s = pd.to_numeric(df[col], errors="coerce")
        print(f"  {col:<22} mean={s.mean():>10,.4f} min={s.min():>10,.4f} max={s.max():>10,.4f}")
    print()
    print(f"Dataset parquet:   {BUYER_RISK_PARQUET}")
    print(f"Dataset csv:       {BUYER_RISK_CSV}")


def main() -> None:
    args = parse_args()
    if not (100 <= args.buyers <= 200):
        raise SystemExit("--buyers should be between 100 and 200 for this phase.")
    if args.orders < 1:
        raise SystemExit("--orders must be positive.")

    rng = random.Random(args.seed)
    as_of = date.fromisoformat(args.as_of)
    if not get_database_url().startswith("postgresql"):
        raise RuntimeError("Legacy PostgreSQL-only data generator is disabled. Existing data has been copied to SQL Server; do not reset the database.")
    engine = create_engine(get_database_url(), pool_pre_ping=True)

    with engine.begin() as conn:
        if args.reset:
            print("Resetting generated behavior data...")
            reset_demo_data(conn)
        elif conn.execute(text("SELECT COUNT(*) FROM users WHERE email LIKE :f"), {"f": f"{BUYER_EMAIL_PREFIX}%@{BUYER_EMAIL_DOMAIN}"}).scalar_one():
            raise RuntimeError("Generated behavior data already exists. Re-run with --reset to replace it safely.")

        shops, variants_by_product, products = load_catalog(conn)
        print(f"Catalog loaded: {len(shops)} active shops, {len(products)} active products.")

        buyers = create_buyers(conn, rng, args.buyers, as_of)
        order_counts = allocate_order_counts(rng, [buyer["profile"] for buyer in buyers], args.orders)
        products_by_shop = prepare_weighted_catalog(products)
        counters = create_orders(conn, rng, buyers, order_counts, shops, products_by_shop, variants_by_product, as_of)
        rebuild_buyer_profiles(conn)
        feature_snapshots = create_feature_snapshots(conn, buyers, as_of)
        validate_generated_data(conn)
        df = export_dataset(conn)
        print_summary(conn, counters, feature_snapshots, df)


if __name__ == "__main__":
    main()
