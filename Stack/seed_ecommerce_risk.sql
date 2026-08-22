-- ================================================================
-- SEED DATA - ECOMMERCE + BUYER RISK SCORING DEMO
-- Dùng cho database phát triển/demo. Có TRUNCATE ở đầu: XÓA DATA CŨ.
-- Schema mục tiêu: ecommerce_risk_scoring / public
-- ================================================================

BEGIN;

TRUNCATE TABLE
    recommendation_actions,
    recommendations,
    risk_explanations,
    risk_predictions,
    ml_training_runs,
    ml_models,
    buyer_features,
    buyer_profiles,
    reviews,
    returns,
    shipments,
    payments,
    order_status_history,
    order_items,
    orders,
    wishlist_items,
    wishlists,
    cart_items,
    carts,
    product_variants,
    product_images,
    products,
    categories,
    shop_members,
    shops,
    addresses,
    user_roles,
    roles,
    notifications,
    audit_logs,
    users
RESTART IDENTITY CASCADE;

-- ================================================================
-- 1. USERS / ROLES
-- password_hash là giá trị demo; khi làm Auth thật, seed bằng bcrypt.
-- ================================================================

INSERT INTO users (id, email, password_hash, full_name, phone, avatar_url, status)
VALUES
('11111111-1111-4111-8111-111111111111', 'admin@riskshop.local', 'DEMO_HASH_ADMIN', 'Nguyễn Gia Huy', '0901000001', 'https://i.pravatar.cc/150?img=12', 'ACTIVE'),
('22222222-2222-4222-8222-222222222222', 'seller1@riskshop.local', 'DEMO_HASH_SELLER1', 'Trần Minh Khang', '0901000002', 'https://i.pravatar.cc/150?img=32', 'ACTIVE'),
('33333333-3333-4333-8333-333333333333', 'seller2@riskshop.local', 'DEMO_HASH_SELLER2', 'Lê Hoàng Nam', '0901000003', 'https://i.pravatar.cc/150?img=11', 'ACTIVE'),
('44444444-4444-4444-8444-444444444444', 'buyer01@riskshop.local', 'DEMO_HASH_BUYER', 'Phạm Minh Anh', '0901000004', 'https://i.pravatar.cc/150?img=47', 'ACTIVE'),
('55555555-5555-4555-8555-555555555555', 'buyer02@riskshop.local', 'DEMO_HASH_BUYER', 'Nguyễn Thu Hà', '0901000005', 'https://i.pravatar.cc/150?img=44', 'ACTIVE'),
('66666666-6666-4666-8666-666666666666', 'buyer03@riskshop.local', 'DEMO_HASH_BUYER', 'Trần Quốc Bảo', '0901000006', 'https://i.pravatar.cc/150?img=13', 'ACTIVE'),
('77777777-7777-4777-8777-777777777777', 'buyer04@riskshop.local', 'DEMO_HASH_BUYER', 'Lê Ngọc Lan', '0901000007', 'https://i.pravatar.cc/150?img=49', 'ACTIVE'),
('88888888-8888-4888-8888-888888888888', 'buyer05@riskshop.local', 'DEMO_HASH_BUYER', 'Đỗ Minh Quân', '0901000008', 'https://i.pravatar.cc/150?img=15', 'ACTIVE'),
('99999999-9999-4999-8999-999999999999', 'buyer06@riskshop.local', 'DEMO_HASH_BUYER', 'Phan Thảo Vy', '0901000009', 'https://i.pravatar.cc/150?img=45', 'ACTIVE'),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'buyer07@riskshop.local', 'DEMO_HASH_BUYER', 'Võ Nhật Minh', '0901000010', 'https://i.pravatar.cc/150?img=51', 'ACTIVE');

INSERT INTO roles (id, name)
VALUES
(1, 'ADMIN'),
(2, 'SELLER'),
(3, 'BUYER');

INSERT INTO user_roles (user_id, role_id)
VALUES
('11111111-1111-4111-8111-111111111111', 1),
('22222222-2222-4222-8222-222222222222', 2),
('33333333-3333-4333-8333-333333333333', 2),
('44444444-4444-4444-8444-444444444444', 3),
('55555555-5555-4555-8555-555555555555', 3),
('66666666-6666-4666-8666-666666666666', 3),
('77777777-7777-4777-8777-777777777777', 3),
('88888888-8888-4888-8888-888888888888', 3),
('99999999-9999-4999-8999-999999999999', 3),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 3);

INSERT INTO addresses (id, user_id, receiver_name, phone, province, district, ward, address_detail, is_default)
VALUES
(1, '44444444-4444-4444-8444-444444444444', 'Phạm Minh Anh', '0901000004', 'TP. Hồ Chí Minh', 'Quận 1', 'Bến Nghé', '12 Nguyễn Huệ', TRUE),
(2, '55555555-5555-4555-8555-555555555555', 'Nguyễn Thu Hà', '0901000005', 'TP. Hồ Chí Minh', 'Quận 3', 'Võ Thị Sáu', '25 Võ Thị Sáu', TRUE),
(3, '66666666-6666-4666-8666-666666666666', 'Trần Quốc Bảo', '0901000006', 'TP. Hồ Chí Minh', 'Tân Bình', '2', '88 Cộng Hòa', TRUE),
(4, '77777777-7777-4777-8777-777777777777', 'Lê Ngọc Lan', '0901000007', 'TP. Hồ Chí Minh', 'Bình Thạnh', '25', '101 Xô Viết Nghệ Tĩnh', TRUE),
(5, '88888888-8888-4888-8888-888888888888', 'Đỗ Minh Quân', '0901000008', 'TP. Hồ Chí Minh', 'Gò Vấp', '10', '44 Phan Văn Trị', TRUE),
(6, '99999999-9999-4999-8999-999999999999', 'Phan Thảo Vy', '0901000009', 'Đồng Nai', 'Biên Hòa', 'Tân Hiệp', '16 Đồng Khởi', TRUE),
(7, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Võ Nhật Minh', '0901000010', 'Bình Dương', 'Thủ Dầu Một', 'Phú Cường', '50 Yersin', TRUE);

-- ================================================================
-- 2. SHOPS
-- ================================================================

INSERT INTO shops (id, owner_id, name, description, logo_url, status)
VALUES
(1, '22222222-2222-4222-8222-222222222222', 'TechZone Official', 'Thiết bị công nghệ và phụ kiện chính hãng.', 'https://picsum.photos/seed/techzone/200/200', 'ACTIVE'),
(2, '33333333-3333-4333-8333-333333333333', 'Home & Living', 'Đồ gia dụng và sản phẩm tiện ích cho gia đình.', 'https://picsum.photos/seed/homeliving/200/200', 'ACTIVE');

INSERT INTO shop_members (shop_id, user_id, role)
VALUES
(1, '22222222-2222-4222-8222-222222222222', 'OWNER'),
(1, '11111111-1111-4111-8111-111111111111', 'ADMIN'),
(2, '33333333-3333-4333-8333-333333333333', 'OWNER');

-- ================================================================
-- 3. CATEGORIES / PRODUCTS
-- ================================================================

INSERT INTO categories (id, parent_id, name, description, status)
VALUES
(1, NULL, 'Điện tử', 'Thiết bị điện tử và công nghệ.', 'ACTIVE'),
(2, 1, 'Phụ kiện', 'Phụ kiện cho thiết bị điện tử.', 'ACTIVE'),
(3, 1, 'Laptop', 'Máy tính xách tay.', 'ACTIVE'),
(4, NULL, 'Gia dụng', 'Sản phẩm gia dụng và tiện ích.', 'ACTIVE'),
(5, 4, 'Nhà bếp', 'Thiết bị dùng trong nhà bếp.', 'ACTIVE'),
(6, 4, 'Vệ sinh nhà cửa', 'Thiết bị và vật dụng vệ sinh.', 'ACTIVE');

INSERT INTO products (id, shop_id, category_id, name, description, price, stock_quantity, status)
VALUES
(1, 1, 2, 'Tai nghe Bluetooth Pro X', 'Tai nghe không dây, chống ồn chủ động, pin 32 giờ.', 1299000, 42, 'ACTIVE'),
(2, 1, 2, 'Bàn phím cơ RGB K87', 'Bàn phím cơ 87 phím, switch hot-swap, LED RGB.', 899000, 35, 'ACTIVE'),
(3, 1, 3, 'Laptop Pro 14', 'Laptop 14 inch cho lập trình và học tập.', 18990000, 12, 'ACTIVE'),
(4, 1, 2, 'Chuột không dây Silent M3', 'Chuột công thái học, pin 12 tháng.', 499000, 60, 'ACTIVE'),
(5, 1, 2, 'Webcam Full HD C920', 'Webcam Full HD hỗ trợ học trực tuyến và họp online.', 1599000, 18, 'ACTIVE'),
(6, 2, 5, 'Nồi chiên không dầu 5L', 'Nồi chiên 5 lít, 8 chế độ nấu.', 1499000, 22, 'ACTIVE'),
(7, 2, 5, 'Máy xay đa năng 600W', 'Máy xay gia đình 600W, 3 cối.', 799000, 30, 'ACTIVE'),
(8, 2, 6, 'Máy hút bụi cầm tay V2', 'Máy hút bụi nhỏ gọn cho nhà ở và xe hơi.', 1199000, 25, 'ACTIVE'),
(9, 2, 4, 'Đèn bàn học Smart LED', 'Đèn LED 3 màu, điều chỉnh độ sáng.', 399000, 50, 'ACTIVE'),
(10, 1, 2, 'Hub USB-C 8 in 1', 'Hub USB-C với HDMI, USB-A, PD và SD card.', 1099000, 27, 'ACTIVE'),
(11, 2, 5, 'Ấm siêu tốc Inox 1.7L', 'Ấm siêu tốc 1.7L, tự ngắt khi sôi.', 459000, 40, 'ACTIVE'),
(12, 1, 2, 'Sạc nhanh GaN 65W', 'Củ sạc GaN 65W 3 cổng.', 699000, 45, 'ACTIVE');

INSERT INTO product_images (id, product_id, image_url, is_primary)
VALUES
(1, 1, 'https://picsum.photos/seed/p1/600/600', TRUE),
(2, 2, 'https://picsum.photos/seed/p2/600/600', TRUE),
(3, 3, 'https://picsum.photos/seed/p3/600/600', TRUE),
(4, 4, 'https://picsum.photos/seed/p4/600/600', TRUE),
(5, 5, 'https://picsum.photos/seed/p5/600/600', TRUE),
(6, 6, 'https://picsum.photos/seed/p6/600/600', TRUE),
(7, 7, 'https://picsum.photos/seed/p7/600/600', TRUE),
(8, 8, 'https://picsum.photos/seed/p8/600/600', TRUE),
(9, 9, 'https://picsum.photos/seed/p9/600/600', TRUE),
(10, 10, 'https://picsum.photos/seed/p10/600/600', TRUE),
(11, 11, 'https://picsum.photos/seed/p11/600/600', TRUE),
(12, 12, 'https://picsum.photos/seed/p12/600/600', TRUE);

INSERT INTO product_variants (id, product_id, variant_name, price, stock_quantity)
VALUES
(1, 1, 'Đen', 1299000, 25),
(2, 1, 'Trắng', 1299000, 17),
(3, 2, 'Blue Switch', 899000, 20),
(4, 2, 'Brown Switch', 949000, 15),
(5, 3, '16GB / 512GB', 18990000, 8),
(6, 3, '32GB / 1TB', 22990000, 4),
(7, 6, '5L', 1499000, 22),
(8, 7, '3 cối', 799000, 30),
(9, 12, '65W', 699000, 45);

-- ================================================================
-- 4. SHOPPING
-- ================================================================

INSERT INTO carts (id, user_id) VALUES
(1, '44444444-4444-4444-8444-444444444444'),
(2, '55555555-5555-4555-8555-555555555555'),
(3, '66666666-6666-4666-8666-666666666666');

INSERT INTO cart_items (id, cart_id, product_id, variant_id, quantity, price)
VALUES
(1, 1, 1, 1, 1, 1299000),
(2, 1, 12, 9, 1, 699000),
(3, 2, 6, 7, 1, 1499000),
(4, 3, 2, 4, 1, 949000);

INSERT INTO wishlists (id, user_id) VALUES
(1, '44444444-4444-4444-8444-444444444444'),
(2, '55555555-5555-4555-8555-555555555555'),
(3, '77777777-7777-4777-8777-777777777777');

INSERT INTO wishlist_items (wishlist_id, product_id) VALUES
(1, 3), (1, 5), (2, 6), (2, 11), (3, 1), (3, 9);

-- ================================================================
-- 5. ORDERS - tạo nhiều trạng thái để ML có dữ liệu hành vi.
-- buyer 4444: tốt
-- buyer 5555: khá ổn
-- buyer 6666: trung bình
-- buyer 7777: rủi ro cao
-- buyer 8888: trung bình cao
-- buyer 9999: thấp
-- buyer aaaa: rủi ro rất cao
-- ================================================================

INSERT INTO orders (
    id, order_code, buyer_id, shop_id, shipping_address_id,
    shipping_receiver_name, shipping_phone, shipping_province, shipping_district,
    shipping_ward, shipping_address_detail, subtotal, shipping_fee,
    discount_amount, total_amount, status, payment_status, created_at, updated_at
)
VALUES
(1,  'ORD-20260801-001', '44444444-4444-4444-8444-444444444444', 1, 1, 'Phạm Minh Anh','0901000004','TP. Hồ Chí Minh','Quận 1','Bến Nghé','12 Nguyễn Huệ',1299000,30000,0,1329000,'COMPLETED','PAID','2026-08-01 09:00+07','2026-08-03 15:00+07'),
(2,  'ORD-20260803-002', '44444444-4444-4444-8444-444444444444', 1, 2, 'Phạm Minh Anh','0901000004','TP. Hồ Chí Minh','Quận 3','Võ Thị Sáu','25 Võ Thị Sáu',699000,30000,0,729000,'COMPLETED','PAID','2026-08-03 10:00+07','2026-08-05 16:00+07'),
(3,  'ORD-20260805-003', '55555555-5555-4555-8555-555555555555', 2, 2, 'Nguyễn Thu Hà','0901000005','TP. Hồ Chí Minh','Quận 3','Võ Thị Sáu','25 Võ Thị Sáu',1499000,30000,50000,1479000,'COMPLETED','PAID','2026-08-05 11:00+07','2026-08-07 10:00+07'),
(4,  'ORD-20260806-004', '55555555-5555-4555-8555-555555555555', 2, 2, 'Nguyễn Thu Hà','0901000005','TP. Hồ Chí Minh','Quận 3','Võ Thị Sáu','25 Võ Thị Sáu',799000,30000,0,829000,'DELIVERED','PAID','2026-08-06 13:00+07','2026-08-08 09:00+07'),
(5,  'ORD-20260807-005', '66666666-6666-4666-8666-666666666666', 1, 3, 'Trần Quốc Bảo','0901000006','TP. Hồ Chí Minh','Tân Bình','2','88 Cộng Hòa',899000,30000,0,929000,'RETURNED','REFUNDED','2026-08-07 09:00+07','2026-08-12 12:00+07'),
(6,  'ORD-20260808-006', '66666666-6666-4666-8666-666666666666', 1, 3, 'Trần Quốc Bảo','0901000006','TP. Hồ Chí Minh','Tân Bình','2','88 Cộng Hòa',499000,30000,0,529000,'CANCELLED','UNPAID','2026-08-08 14:00+07','2026-08-08 15:00+07'),
(7,  'ORD-20260809-007', '77777777-7777-4777-8777-777777777777', 1, 4, 'Lê Ngọc Lan','0901000007','TP. Hồ Chí Minh','Bình Thạnh','25','101 Xô Viết Nghệ Tĩnh',1599000,30000,0,1629000,'NON_RECEIVED','PAID','2026-08-09 08:00+07','2026-08-14 17:00+07'),
(8,  'ORD-20260809-008', '77777777-7777-4777-8777-777777777777', 1, 4, 'Lê Ngọc Lan','0901000007','TP. Hồ Chí Minh','Bình Thạnh','25','101 Xô Viết Nghệ Tĩnh',1099000,30000,0,1129000,'CANCELLED','UNPAID','2026-08-09 09:00+07','2026-08-09 09:30+07'),
(9,  'ORD-20260810-009', '77777777-7777-4777-8777-777777777777', 1, 4, 'Lê Ngọc Lan','0901000007','TP. Hồ Chí Minh','Bình Thạnh','25','101 Xô Viết Nghệ Tĩnh',1299000,30000,0,1329000,'NON_RECEIVED','PAID','2026-08-10 10:00+07','2026-08-15 16:00+07'),
(10, 'ORD-20260811-010', '77777777-7777-4777-8777-777777777777', 2, 4, 'Lê Ngọc Lan','0901000007','TP. Hồ Chí Minh','Bình Thạnh','25','101 Xô Viết Nghệ Tĩnh',1499000,30000,0,1529000,'CANCELLED','UNPAID','2026-08-11 11:00+07','2026-08-11 11:15+07'),
(11, 'ORD-20260811-011', '88888888-8888-4888-8888-888888888888', 1, 5, 'Đỗ Minh Quân','0901000008','TP. Hồ Chí Minh','Gò Vấp','10','44 Phan Văn Trị',899000,30000,0,929000,'COMPLETED','PAID','2026-08-11 08:00+07','2026-08-13 16:00+07'),
(12, 'ORD-20260812-012', '88888888-8888-4888-8888-888888888888', 1, 5, 'Đỗ Minh Quân','0901000008','TP. Hồ Chí Minh','Gò Vấp','10','44 Phan Văn Trị',1299000,30000,0,1329000,'RETURNED','REFUNDED','2026-08-12 10:00+07','2026-08-16 13:00+07'),
(13, 'ORD-20260813-013', '88888888-8888-4888-8888-888888888888', 2, 5, 'Đỗ Minh Quân','0901000008','TP. Hồ Chí Minh','Gò Vấp','10','44 Phan Văn Trị',799000,30000,0,829000,'FAILED','FAILED','2026-08-13 09:00+07','2026-08-14 12:00+07'),
(14, 'ORD-20260813-014', '99999999-9999-4999-8999-999999999999', 2, 6, 'Phan Thảo Vy','0901000009','Đồng Nai','Biên Hòa','Tân Hiệp','16 Đồng Khởi',459000,30000,0,489000,'COMPLETED','PAID','2026-08-13 07:30+07','2026-08-15 10:00+07'),
(15, 'ORD-20260814-015', '99999999-9999-4999-8999-999999999999', 1, 6, 'Phan Thảo Vy','0901000009','Đồng Nai','Biên Hòa','Tân Hiệp','16 Đồng Khởi',1099000,30000,0,1129000,'COMPLETED','PAID','2026-08-14 08:30+07','2026-08-16 14:00+07'),
(16, 'ORD-20260814-016', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, 7, 'Võ Nhật Minh','0901000010','Bình Dương','Thủ Dầu Một','Phú Cường','50 Yersin',899000,30000,0,929000,'CANCELLED','UNPAID','2026-08-14 09:00+07','2026-08-14 09:10+07'),
(17, 'ORD-20260814-017', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, 7, 'Võ Nhật Minh','0901000010','Bình Dương','Thủ Dầu Một','Phú Cường','50 Yersin',499000,30000,0,529000,'CANCELLED','UNPAID','2026-08-14 10:00+07','2026-08-14 10:12+07'),
(18, 'ORD-20260815-018', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 2, 7, 'Võ Nhật Minh','0901000010','Bình Dương','Thủ Dầu Một','Phú Cường','50 Yersin',1499000,30000,0,1529000,'NON_RECEIVED','PAID','2026-08-15 08:00+07','2026-08-20 17:00+07'),
(19, 'ORD-20260815-019', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, 7, 'Võ Nhật Minh','0901000010','Bình Dương','Thủ Dầu Một','Phú Cường','50 Yersin',1599000,30000,0,1629000,'FAILED','FAILED','2026-08-15 09:00+07','2026-08-16 11:00+07'),
(20, 'ORD-20260816-020', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, 7, 'Võ Nhật Minh','0901000010','Bình Dương','Thủ Dầu Một','Phú Cường','50 Yersin',1299000,30000,0,1329000,'NON_RECEIVED','PAID','2026-08-16 10:00+07','2026-08-21 17:00+07');

INSERT INTO order_items (id, order_id, product_id, variant_id, product_name, quantity, unit_price, subtotal)
VALUES
(1,1,1,1,'Tai nghe Bluetooth Pro X',1,1299000,1299000),
(2,2,12,9,'Sạc nhanh GaN 65W',1,699000,699000),
(3,3,6,7,'Nồi chiên không dầu 5L',1,1499000,1499000),
(4,4,7,8,'Máy xay đa năng 600W',1,799000,799000),
(5,5,2,4,'Bàn phím cơ RGB K87',1,899000,899000),
(6,6,4,NULL,'Chuột không dây Silent M3',1,499000,499000),
(7,7,5,NULL,'Webcam Full HD C920',1,1599000,1599000),
(8,8,10,NULL,'Hub USB-C 8 in 1',1,1099000,1099000),
(9,9,1,1,'Tai nghe Bluetooth Pro X',1,1299000,1299000),
(10,10,6,7,'Nồi chiên không dầu 5L',1,1499000,1499000),
(11,11,2,3,'Bàn phím cơ RGB K87',1,899000,899000),
(12,12,1,1,'Tai nghe Bluetooth Pro X',1,1299000,1299000),
(13,13,7,8,'Máy xay đa năng 600W',1,799000,799000),
(14,14,11,NULL,'Ấm siêu tốc Inox 1.7L',1,459000,459000),
(15,15,10,NULL,'Hub USB-C 8 in 1',1,1099000,1099000),
(16,16,2,3,'Bàn phím cơ RGB K87',1,899000,899000),
(17,17,4,NULL,'Chuột không dây Silent M3',1,499000,499000),
(18,18,6,7,'Nồi chiên không dầu 5L',1,1499000,1499000),
(19,19,5,NULL,'Webcam Full HD C920',1,1599000,1599000),
(20,20,1,1,'Tai nghe Bluetooth Pro X',1,1299000,1299000);

INSERT INTO order_status_history (id, order_id, old_status, new_status, changed_by, created_at)
VALUES
(1,1,NULL,'PENDING',NULL,'2026-08-01 09:00+07'),
(2,1,'PENDING','CONFIRMED','22222222-2222-4222-8222-222222222222','2026-08-01 10:00+07'),
(3,1,'CONFIRMED','COMPLETED','22222222-2222-4222-8222-222222222222','2026-08-03 15:00+07'),
(4,5,NULL,'PENDING',NULL,'2026-08-07 09:00+07'),
(5,5,'PENDING','RETURNED','22222222-2222-4222-8222-222222222222','2026-08-12 12:00+07'),
(6,6,NULL,'PENDING',NULL,'2026-08-08 14:00+07'),
(7,6,'PENDING','CANCELLED','22222222-2222-4222-8222-222222222222','2026-08-08 15:00+07'),
(8,7,NULL,'PENDING',NULL,'2026-08-09 08:00+07'),
(9,7,'PENDING','NON_RECEIVED','22222222-2222-4222-8222-222222222222','2026-08-14 17:00+07'),
(10,8,NULL,'PENDING',NULL,'2026-08-09 09:00+07'),
(11,8,'PENDING','CANCELLED','22222222-2222-4222-8222-222222222222','2026-08-09 09:30+07'),
(12,9,NULL,'PENDING',NULL,'2026-08-10 10:00+07'),
(13,9,'PENDING','NON_RECEIVED','22222222-2222-4222-8222-222222222222','2026-08-15 16:00+07');

-- ================================================================
-- 6. PAYMENTS / SHIPMENTS / RETURNS
-- ================================================================

INSERT INTO payments (id, order_id, method, amount, status, transaction_code, paid_at)
VALUES
(1,1,'CREDIT_CARD',1329000,'PAID','PAY-0001','2026-08-01 09:05+07'),
(2,2,'E_WALLET',729000,'PAID','PAY-0002','2026-08-03 10:05+07'),
(3,3,'COD',1479000,'PAID','PAY-0003','2026-08-07 10:00+07'),
(4,4,'COD',829000,'PAID','PAY-0004','2026-08-08 11:00+07'),
(5,5,'COD',929000,'REFUNDED','PAY-0005','2026-08-07 09:05+07'),
(6,7,'COD',1629000,'PAID','PAY-0007','2026-08-09 08:05+07'),
(7,9,'COD',1329000,'PAID','PAY-0009','2026-08-10 10:05+07'),
(8,11,'BANK_TRANSFER',929000,'PAID','PAY-0011','2026-08-11 08:15+07'),
(9,12,'COD',1329000,'REFUNDED','PAY-0012','2026-08-12 10:05+07'),
(10,14,'E_WALLET',489000,'PAID','PAY-0014','2026-08-13 07:40+07'),
(11,15,'CREDIT_CARD',1129000,'PAID','PAY-0015','2026-08-14 08:35+07'),
(12,18,'COD',1529000,'PAID','PAY-0018','2026-08-15 08:05+07'),
(13,20,'COD',1329000,'PAID','PAY-0020','2026-08-16 10:05+07');

INSERT INTO shipments (id, order_id, carrier, tracking_code, status, shipped_at, delivered_at)
VALUES
(1,1,'GHN','GHN000001','DELIVERED','2026-08-01 14:00+07','2026-08-03 15:00+07'),
(2,2,'J&T','JT000002','DELIVERED','2026-08-03 16:00+07','2026-08-05 16:00+07'),
(3,3,'GHN','GHN000003','DELIVERED','2026-08-05 18:00+07','2026-08-07 10:00+07'),
(4,4,'GHN','GHN000004','DELIVERED','2026-08-06 16:00+07','2026-08-08 09:00+07'),
(5,5,'J&T','JT000005','RETURNED_TO_SHOP','2026-08-07 17:00+07',NULL),
(6,7,'GHN','GHN000007','RETURNED_TO_SHOP','2026-08-09 14:00+07',NULL),
(7,9,'GHN','GHN000009','RETURNED_TO_SHOP','2026-08-10 14:00+07',NULL),
(8,11,'J&T','JT000011','DELIVERED','2026-08-11 15:00+07','2026-08-13 16:00+07'),
(9,12,'GHN','GHN000012','RETURNED_TO_SHOP','2026-08-12 16:00+07',NULL),
(10,14,'J&T','JT000014','DELIVERED','2026-08-13 14:00+07','2026-08-15 10:00+07'),
(11,15,'GHN','GHN000015','DELIVERED','2026-08-14 15:00+07','2026-08-16 14:00+07'),
(12,18,'GHN','GHN000018','RETURNED_TO_SHOP','2026-08-15 15:00+07',NULL),
(13,20,'J&T','JT000020','RETURNED_TO_SHOP','2026-08-16 15:00+07',NULL);

INSERT INTO returns (id, order_id, reason, status, requested_at, processed_at)
VALUES
(1,5,'Không phù hợp nhu cầu sử dụng','COMPLETED','2026-08-09 09:00+07','2026-08-12 12:00+07'),
(2,12,'Sản phẩm không đúng kỳ vọng','COMPLETED','2026-08-14 09:00+07','2026-08-16 13:00+07');

-- ================================================================
-- 7. BUYER PROFILE / FEATURE STORE
-- ================================================================

INSERT INTO buyer_profiles (
    id, buyer_id, total_orders, completed_orders, cancelled_orders,
    returned_orders, failed_orders, non_received_orders, total_spent,
    average_order_value, first_order_at, last_order_at
)
VALUES
(1,'44444444-4444-4444-8444-444444444444',2,2,0,0,0,0,2028000,1014000,'2026-08-01 09:00+07','2026-08-03 10:00+07'),
(2,'55555555-5555-4555-8555-555555555555',2,2,0,0,0,0,2308000,1154000,'2026-08-05 11:00+07','2026-08-06 13:00+07'),
(3,'66666666-6666-4666-8666-666666666666',2,0,1,1,0,0,0,714000,'2026-08-07 09:00+07','2026-08-08 14:00+07'),
(4,'77777777-7777-4777-8777-777777777777',4,0,2,0,0,2,0,1422000,'2026-08-09 08:00+07','2026-08-11 11:00+07'),
(5,'88888888-8888-4888-8888-888888888888',3,1,0,1,1,0,929000,1039000,'2026-08-11 08:00+07','2026-08-13 09:00+07'),
(6,'99999999-9999-4999-8999-999999999999',2,2,0,0,0,0,1588000,794000,'2026-08-13 07:30+07','2026-08-14 08:30+07'),
(7,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',5,0,2,0,1,2,0,1218000,'2026-08-14 09:00+07','2026-08-16 10:00+07');

INSERT INTO buyer_features (
    id, buyer_id, feature_date, cancel_rate, return_rate, failure_rate,
    non_receive_rate, total_order_value, average_order_value,
    orders_last_7_days, orders_last_30_days, avg_order_interval
)
VALUES
(1,'44444444-4444-4444-8444-444444444444','2026-08-20',0.02,0.01,0.00,0.01,5800000,1014000,2,8,5.2),
(2,'55555555-5555-4555-8555-555555555555','2026-08-20',0.04,0.02,0.01,0.01,7600000,1154000,2,9,4.8),
(3,'66666666-6666-4666-8666-666666666666','2026-08-20',0.42,0.30,0.03,0.12,5200000,714000,2,7,2.4),
(4,'77777777-7777-4777-8777-777777777777','2026-08-20',0.62,0.08,0.03,0.55,7800000,1422000,4,14,0.8),
(5,'88888888-8888-4888-8888-888888888888','2026-08-20',0.19,0.23,0.13,0.08,6400000,1039000,3,10,1.9),
(6,'99999999-9999-4999-8999-999999999999','2026-08-20',0.02,0.01,0.00,0.01,9100000,794000,2,6,6.1),
(7,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','2026-08-20',0.71,0.05,0.16,0.62,9800000,1218000,5,18,0.6);

-- ================================================================
-- 8. ML MODEL / TRAINING RUN
-- ================================================================

INSERT INTO ml_models (id, model_name, algorithm, version, accuracy, precision_score, recall_score, f1_score, roc_auc, model_path, is_active)
VALUES
(1, 'buyer-risk-isolation-forest', 'Isolation Forest', 'v1.0.0', NULL, NULL, NULL, NULL, NULL, 'models/buyer-risk-isolation-forest-v1.joblib', TRUE);

INSERT INTO ml_training_runs (id, model_id, dataset_version, feature_date_from, feature_date_to, training_samples, testing_samples, started_at, completed_at, status)
VALUES
(1, 1, 'buyer-features-demo-v1', '2026-08-01', '2026-08-20', 600, 150, '2026-08-20 20:00+07', '2026-08-20 20:02+07', 'SUCCESS');

-- ================================================================
-- 9. RISK PREDICTIONS / EXPLANATIONS / RECOMMENDATIONS
-- ================================================================

INSERT INTO risk_predictions (id, buyer_id, order_id, model_id, risk_probability, risk_score, risk_level, predicted_at)
VALUES
(1,'44444444-4444-4444-8444-444444444444',1,1,0.08,12.00,'LOW','2026-08-20 18:00+07'),
(2,'55555555-5555-4555-8555-555555555555',3,1,0.15,22.00,'LOW','2026-08-20 18:01+07'),
(3,'66666666-6666-4666-8666-666666666666',5,1,0.58,58.00,'MEDIUM','2026-08-20 18:02+07'),
(4,'77777777-7777-4777-8777-777777777777',7,1,0.86,86.00,'HIGH','2026-08-20 18:03+07'),
(5,'88888888-8888-4888-8888-888888888888',12,1,0.68,68.00,'HIGH','2026-08-20 18:04+07'),
(6,'99999999-9999-4999-8999-999999999999',15,1,0.05,8.00,'LOW','2026-08-20 18:05+07'),
(7,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',18,1,0.94,94.00,'CRITICAL','2026-08-20 18:06+07');

INSERT INTO risk_explanations (id, prediction_id, feature_name, feature_value, impact_value, impact_direction, description)
VALUES
(1,1,'cancel_rate',0.02,-0.60,'POSITIVE','Tỷ lệ hủy đơn thấp, gần mức hành vi thông thường.'),
(2,1,'non_receive_rate',0.01,-0.55,'POSITIVE','Tỷ lệ không nhận hàng rất thấp.'),
(3,3,'cancel_rate',0.42,0.48,'NEGATIVE','Tỷ lệ hủy đơn cao hơn đáng kể so với nhóm bình thường.'),
(4,3,'return_rate',0.30,0.31,'NEGATIVE','Tỷ lệ hoàn trả tương đối cao.'),
(5,4,'cancel_rate',0.62,0.72,'NEGATIVE','Tỷ lệ hủy đơn rất cao.'),
(6,4,'non_receive_rate',0.55,0.81,'NEGATIVE','Tỷ lệ không nhận hàng rất cao và là yếu tố ảnh hưởng lớn.'),
(7,4,'orders_last_7_days',4,0.41,'NEGATIVE','Tần suất đặt hàng tăng cao trong thời gian ngắn.'),
(8,5,'return_rate',0.23,0.32,'NEGATIVE','Tỷ lệ hoàn trả cao.'),
(9,5,'failure_rate',0.13,0.21,'NEGATIVE','Có nhiều giao dịch thất bại.'),
(10,7,'cancel_rate',0.71,0.86,'NEGATIVE','Tỷ lệ hủy đơn cực cao.'),
(11,7,'non_receive_rate',0.62,0.91,'NEGATIVE','Tỷ lệ không nhận hàng cực cao.'),
(12,7,'orders_last_7_days',5,0.66,'NEGATIVE','Số lượng đơn trong 7 ngày cao bất thường.');

INSERT INTO recommendations (id, prediction_id, action_type, title, description)
VALUES
(1,1,'NO_ACTION','Xử lý bình thường','Không phát hiện dấu hiệu bất thường đáng kể.'),
(2,3,'FLAG_FOR_REVIEW','Nên kiểm tra đơn','Buyer có tỷ lệ hủy/hoàn cao hơn mức thông thường.'),
(3,4,'REQUIRE_PREPAYMENT','Ưu tiên xác nhận thanh toán trước','Buyer có rủi ro cao, nên hạn chế rủi ro COD.'),
(4,5,'FLAG_FOR_REVIEW','Kiểm tra lịch sử giao dịch','Buyer có tỷ lệ hoàn và thất bại tương đối cao.'),
(5,7,'LIMIT_COD','Hạn chế COD','Buyer có hành vi bất thường rõ rệt và điểm rủi ro rất cao.'),
(6,7,'BLOCK_BUYER','Xem xét chặn buyer','Rủi ro ở mức CRITICAL, cần kiểm tra thủ công trước khi tiếp tục giao dịch.');

INSERT INTO recommendation_actions (id, recommendation_id, seller_id, decision, note)
VALUES
(1,1,'22222222-2222-4222-8222-222222222222','IGNORED','Đơn bình thường, xử lý theo quy trình.'),
(2,2,'22222222-2222-4222-8222-222222222222','CONTACTED_BUYER','Đã liên hệ buyer để xác nhận đơn.'),
(3,3,'22222222-2222-4222-8222-222222222222','REQUIRE_PREPAYMENT','Yêu cầu thanh toán trước khi giao.'),
(4,4,'33333333-3333-4333-8333-333333333333','CONTACTED_BUYER','Đang xác minh thông tin nhận hàng.'),
(5,5,'33333333-3333-4333-8333-333333333333','BLOCKED_BUYER','Tạm khóa COD do Risk Score rất cao.');

-- ================================================================
-- 10. REVIEWS / NOTIFICATIONS / AUDIT LOGS
-- ================================================================

INSERT INTO reviews (id, order_id, product_id, buyer_id, rating, comment)
VALUES
(1,1,1,'44444444-4444-4444-8444-444444444444',5,'Sản phẩm tốt, giao nhanh.'),
(2,2,12,'44444444-4444-4444-8444-444444444444',5,'Sạc nhỏ gọn và ổn định.'),
(3,3,6,'55555555-5555-4555-8555-555555555555',4,'Dùng tốt, hơi lớn một chút.'),
(4,4,7,'55555555-5555-4555-8555-555555555555',4,'Máy xay hoạt động ổn.'),
(5,11,2,'88888888-8888-4888-8888-888888888888',3,'Sản phẩm ổn nhưng giao hơi lâu.'),
(6,14,11,'99999999-9999-4999-8999-999999999999',5,'Đun nhanh, tiện dụng.');

INSERT INTO notifications (id, user_id, title, message, type, reference_type, reference_id, is_read)
VALUES
(1,'22222222-2222-4222-8222-222222222222','Cảnh báo rủi ro buyer','Buyer Lê Ngọc Lan có Risk Score 86/100.','RISK_ALERT','risk_prediction',4,FALSE),
(2,'22222222-2222-4222-8222-222222222222','Khuyến nghị xác nhận thanh toán','Hệ thống đề xuất yêu cầu thanh toán trước đối với buyer rủi ro cao.','RISK_ALERT','recommendation',3,FALSE),
(3,'33333333-3333-4333-8333-333333333333','Cảnh báo rủi ro CRITICAL','Buyer Võ Nhật Minh có Risk Score 94/100.','RISK_ALERT','risk_prediction',7,FALSE),
(4,'44444444-4444-4444-8444-444444444444','Đơn hàng đã giao','Đơn ORD-20260801-001 đã hoàn tất.','ORDER_UPDATE','order',1,TRUE),
(5,'55555555-5555-4555-8555-555555555555','Đơn hàng đã giao','Đơn ORD-20260806-004 đã được giao thành công.','ORDER_UPDATE','order',4,FALSE);

INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_data, new_data)
VALUES
(1,'22222222-2222-4222-8222-222222222222','CREATE','order',1,NULL,'{"status":"PENDING"}'),
(2,'22222222-2222-4222-8222-222222222222','REVIEW_RISK','risk_prediction',4,NULL,'{"risk_score":86,"risk_level":"HIGH"}'),
(3,'22222222-2222-4222-8222-222222222222','DECIDE','recommendation',3,NULL,'{"decision":"REQUIRE_PREPAYMENT"}'),
(4,'33333333-3333-4333-8333-333333333333','DECIDE','recommendation',5,NULL,'{"decision":"BLOCKED_BUYER"}');

-- ================================================================
-- 11. RESET SEQUENCES SAU KHI DÙNG ID CỐ ĐỊNH
-- ================================================================

SELECT setval(pg_get_serial_sequence('roles','id'), COALESCE((SELECT MAX(id) FROM roles), 1), true);
SELECT setval(pg_get_serial_sequence('addresses','id'), COALESCE((SELECT MAX(id) FROM addresses), 1), true);
SELECT setval(pg_get_serial_sequence('shops','id'), COALESCE((SELECT MAX(id) FROM shops), 1), true);
SELECT setval(pg_get_serial_sequence('shop_members','shop_id'), COALESCE((SELECT MAX(shop_id) FROM shop_members), 1), true);
SELECT setval(pg_get_serial_sequence('categories','id'), COALESCE((SELECT MAX(id) FROM categories), 1), true);
SELECT setval(pg_get_serial_sequence('products','id'), COALESCE((SELECT MAX(id) FROM products), 1), true);
SELECT setval(pg_get_serial_sequence('product_images','id'), COALESCE((SELECT MAX(id) FROM product_images), 1), true);
SELECT setval(pg_get_serial_sequence('product_variants','id'), COALESCE((SELECT MAX(id) FROM product_variants), 1), true);
SELECT setval(pg_get_serial_sequence('carts','id'), COALESCE((SELECT MAX(id) FROM carts), 1), true);
SELECT setval(pg_get_serial_sequence('cart_items','id'), COALESCE((SELECT MAX(id) FROM cart_items), 1), true);
SELECT setval(pg_get_serial_sequence('wishlists','id'), COALESCE((SELECT MAX(id) FROM wishlists), 1), true);
SELECT setval(pg_get_serial_sequence('orders','id'), COALESCE((SELECT MAX(id) FROM orders), 1), true);
SELECT setval(pg_get_serial_sequence('order_items','id'), COALESCE((SELECT MAX(id) FROM order_items), 1), true);
SELECT setval(pg_get_serial_sequence('order_status_history','id'), COALESCE((SELECT MAX(id) FROM order_status_history), 1), true);
SELECT setval(pg_get_serial_sequence('payments','id'), COALESCE((SELECT MAX(id) FROM payments), 1), true);
SELECT setval(pg_get_serial_sequence('shipments','id'), COALESCE((SELECT MAX(id) FROM shipments), 1), true);
SELECT setval(pg_get_serial_sequence('returns','id'), COALESCE((SELECT MAX(id) FROM returns), 1), true);
SELECT setval(pg_get_serial_sequence('buyer_profiles','id'), COALESCE((SELECT MAX(id) FROM buyer_profiles), 1), true);
SELECT setval(pg_get_serial_sequence('buyer_features','id'), COALESCE((SELECT MAX(id) FROM buyer_features), 1), true);
SELECT setval(pg_get_serial_sequence('ml_models','id'), COALESCE((SELECT MAX(id) FROM ml_models), 1), true);
SELECT setval(pg_get_serial_sequence('ml_training_runs','id'), COALESCE((SELECT MAX(id) FROM ml_training_runs), 1), true);
SELECT setval(pg_get_serial_sequence('risk_predictions','id'), COALESCE((SELECT MAX(id) FROM risk_predictions), 1), true);
SELECT setval(pg_get_serial_sequence('risk_explanations','id'), COALESCE((SELECT MAX(id) FROM risk_explanations), 1), true);
SELECT setval(pg_get_serial_sequence('recommendations','id'), COALESCE((SELECT MAX(id) FROM recommendations), 1), true);
SELECT setval(pg_get_serial_sequence('recommendation_actions','id'), COALESCE((SELECT MAX(id) FROM recommendation_actions), 1), true);
SELECT setval(pg_get_serial_sequence('reviews','id'), COALESCE((SELECT MAX(id) FROM reviews), 1), true);
SELECT setval(pg_get_serial_sequence('notifications','id'), COALESCE((SELECT MAX(id) FROM notifications), 1), true);
SELECT setval(pg_get_serial_sequence('audit_logs','id'), COALESCE((SELECT MAX(id) FROM audit_logs), 1), true);

COMMIT;

-- Kiểm tra nhanh
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'shops', COUNT(*) FROM shops
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'buyer_profiles', COUNT(*) FROM buyer_profiles
UNION ALL SELECT 'buyer_features', COUNT(*) FROM buyer_features
UNION ALL SELECT 'ml_models', COUNT(*) FROM ml_models
UNION ALL SELECT 'risk_predictions', COUNT(*) FROM risk_predictions
UNION ALL SELECT 'recommendations', COUNT(*) FROM recommendations;
