-- ================================================================
-- RISKMIND AI - MASTER SEED
-- Gộp: seed_ecommerce_risk + catalog 2026 + coupons 2026-2027 + test data
--
-- 1) CÓ TRUNCATE: xóa dữ liệu cũ ở các bảng seed.
-- 2) Giữ 12 sản phẩm legacy để bảo toàn order/risk demo hiện tại.
-- 3) Thêm catalog 2026 gồm 60 sản phẩm => tổng 72 sản phẩm.
-- 4) Thêm 30 coupon, gắn với 6 danh mục.
-- 5) Toàn bộ seed chạy trong một transaction.
-- ================================================================

-- ================================================================
-- SEED DATA - ECOMMERCE + BUYER RISK SCORING DEMO
-- Dùng cho database phát triển/demo. Có TRUNCATE ở đầu: XÓA DATA CŨ.
-- Schema mục tiêu: ecommerce_risk_scoring / public
-- ================================================================

BEGIN;

TRUNCATE TABLE
    coupon_categories,
    coupons,
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
-- 3B. CATALOG 2026
-- 12 seller + 12 shop + 60 products + images + variants
-- ================================================================
-- RISKMINDAI CATALOG SEED 2026
-- 12 shops = 1 Mall + 1 normal / category; 60 products; variants + primary images
-- Product names are real/current models or products seen in 2026 catalogs; some are not 2026 launches.
-- Existing categories are reused by exact name. Existing data is preserved; this seed only adds missing demo rows.

-- FIX: phần legacy đã chèn id tường minh (1,2,...) nên sequence chưa tăng.
-- Reset sequence TRƯỚC khi catalog 2026 chèn thêm dòng KHÔNG chỉ định id,
-- nếu không sẽ bị duplicate key (shops_pkey, products_pkey, ...).
SELECT setval(pg_get_serial_sequence('roles','id'), COALESCE((SELECT MAX(id) FROM roles), 1), true);
SELECT setval(pg_get_serial_sequence('addresses','id'), COALESCE((SELECT MAX(id) FROM addresses), 1), true);
SELECT setval(pg_get_serial_sequence('shops','id'), COALESCE((SELECT MAX(id) FROM shops), 1), true);
SELECT setval(pg_get_serial_sequence('categories','id'), COALESCE((SELECT MAX(id) FROM categories), 1), true);
SELECT setval(pg_get_serial_sequence('products','id'), COALESCE((SELECT MAX(id) FROM products), 1), true);
SELECT setval(pg_get_serial_sequence('product_images','id'), COALESCE((SELECT MAX(id) FROM product_images), 1), true);
SELECT setval(pg_get_serial_sequence('product_variants','id'), COALESCE((SELECT MAX(id) FROM product_variants), 1), true);

-- SELLER USERS
WITH seed_users(email, full_name, phone) AS (
  VALUES ('seller01@riskmind.local', 'Seller Samsung Official Store', '0900000001'),
  ('seller02@riskmind.local', 'Seller CellphoneS', '0900000002'),
  ('seller03@riskmind.local', 'Seller Philips Official Store', '0900000003'),
  ('seller04@riskmind.local', 'Seller Điện Máy Xanh', '0900000004'),
  ('seller05@riskmind.local', 'Seller HP Official Store', '0900000005'),
  ('seller06@riskmind.local', 'Seller GearVN', '0900000006'),
  ('seller07@riskmind.local', 'Seller LocknLock Official Store', '0900000007'),
  ('seller08@riskmind.local', 'Seller Kitchen Koncept', '0900000008'),
  ('seller09@riskmind.local', 'Seller Logitech Official Store', '0900000009'),
  ('seller10@riskmind.local', 'Seller An Phát Computer', '0900000010'),
  ('seller11@riskmind.local', 'Seller 3M Official Store', '0900000011'),
  ('seller12@riskmind.local', 'Seller Bách Hóa Xanh', '0900000012')
)
INSERT INTO users (email,password_hash,full_name,phone,status)
SELECT email,'$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',full_name,phone,'ACTIVE' FROM seed_users
ON CONFLICT (email) DO UPDATE SET full_name=EXCLUDED.full_name, phone=EXCLUDED.phone, status='ACTIVE';

INSERT INTO roles(name) VALUES ('SELLER') ON CONFLICT (name) DO NOTHING;
INSERT INTO user_roles(user_id,role_id) SELECT u.id,r.id FROM users u CROSS JOIN roles r WHERE r.name='SELLER' AND u.email LIKE 'seller%@riskmind.local' ON CONFLICT DO NOTHING;

-- SHOPS
WITH seed_shops(shop_name,category_name,is_mall,domain,email) AS (
  VALUES ('Samsung Official Store','Điện tử',TRUE,'samsung.com', 'seller01@riskmind.local'),
  ('CellphoneS','Điện tử',FALSE,'cellphones.com.vn', 'seller02@riskmind.local'),
  ('Philips Official Store','Gia dụng',TRUE,'philips.com', 'seller03@riskmind.local'),
  ('Điện Máy Xanh','Gia dụng',FALSE,'dienmayxanh.com', 'seller04@riskmind.local'),
  ('HP Official Store','Laptop',TRUE,'hp.com', 'seller05@riskmind.local'),
  ('GearVN','Laptop',FALSE,'gearvn.com', 'seller06@riskmind.local'),
  ('LocknLock Official Store','Nhà bếp',TRUE,'locknlock.com.vn', 'seller07@riskmind.local'),
  ('Kitchen Koncept','Nhà bếp',FALSE,'kitchenkoncept.vn', 'seller08@riskmind.local'),
  ('Logitech Official Store','Phụ kiện',TRUE,'logitech.com', 'seller09@riskmind.local'),
  ('An Phát Computer','Phụ kiện',FALSE,'anphatpc.com.vn', 'seller10@riskmind.local'),
  ('3M Official Store','Vệ sinh nhà cửa',TRUE,'3m.com', 'seller11@riskmind.local'),
  ('Bách Hóa Xanh','Vệ sinh nhà cửa',FALSE,'bachhoaxanh.com', 'seller12@riskmind.local')
)
INSERT INTO shops(owner_id,name,description,logo_url,status)
SELECT u.id,s.shop_name,CASE WHEN s.is_mall THEN 'MALL | ' ELSE 'SHOP | ' END||s.shop_name||' - demo RiskMind AI','https://www.google.com/s2/favicons?domain='||s.domain||'&sz=128','ACTIVE' FROM seed_shops s JOIN users u ON u.email=s.email WHERE NOT EXISTS (SELECT 1 FROM shops x WHERE x.name=s.shop_name);
INSERT INTO shop_members(shop_id,user_id,role) SELECT sh.id,u.id,'OWNER' FROM shops sh JOIN users u ON u.id=sh.owner_id WHERE u.email LIKE 'seller%@riskmind.local' ON CONFLICT DO NOTHING;

CREATE TEMP TABLE seed_product_map(product_key TEXT PRIMARY KEY, product_id BIGINT NOT NULL) ON COMMIT DROP;
-- PRODUCTS
WITH seed_products(shop_name,category_name,product_key,product_name,description,price,stock_quantity) AS (
  VALUES ('Samsung Official Store','Điện tử','S01P01','Samsung Galaxy S26','Flagship Samsung 2026, màn hình 6.3 inch và Galaxy AI.',27990000,60),
  ('Samsung Official Store','Điện tử','S01P02','Samsung Galaxy S26+','Phiên bản màn hình lớn 6.7 inch thuộc Galaxy S26 Series.',31990000,48),
  ('Samsung Official Store','Điện tử','S01P03','Samsung Galaxy S26 Ultra','Mẫu cao cấp nhất Galaxy S26 Series với màn hình 6.9 inch.',36990000,35),
  ('Samsung Official Store','Điện tử','S01P04','Samsung Galaxy Buds4','Tai nghe true wireless thế hệ mới của Samsung.',4990000,50),
  ('Samsung Official Store','Điện tử','S01P05','Samsung Galaxy Buds4 Pro','Tai nghe cao cấp với chống ồn chủ động.',6490000,36),
  ('CellphoneS','Điện tử','S02P01','Apple iPhone 17','iPhone 17 với chip A19, ProMotion 120Hz và camera 48MP Dual Fusion.',24999000,62),
  ('CellphoneS','Điện tử','S02P02','Apple iPhone Air','iPhone Air với chip A19 Pro và thiết kế siêu mỏng.',31999000,38),
  ('CellphoneS','Điện tử','S02P03','Apple iPhone 17 Pro','iPhone 17 Pro với hệ thống camera Pro và A19 Pro.',34999000,37),
  ('CellphoneS','Điện tử','S02P04','Apple iPhone 17 Pro Max','Mẫu iPhone Pro Max cao cấp nhất trong dòng iPhone 17.',38999000,29),
  ('CellphoneS','Điện tử','S02P05','Apple iPhone 17e','iPhone 17e thuộc dòng iPhone mới nhất của Apple.',17999000,46),
  ('Philips Official Store','Gia dụng','S03P01','Philips Airfryer 3000 Series NA340/00','Nồi chiên không dầu 7.6L, RapidAir Plus, 16 chức năng.',3990000,30),
  ('Philips Official Store','Gia dụng','S03P02','Philips Airfryer 3000 Series NA341/00','Nồi chiên không dầu 7.2L, dòng 3000 Series.',3490000,30),
  ('Philips Official Store','Gia dụng','S03P03','Philips Airfryer 3000 Series NA351/00','Nồi chiên không dầu hai ngăn 9L.',4490000,28),
  ('Philips Official Store','Gia dụng','S03P04','Philips Airfryer 3000 Series NA330/00','Nồi chiên không dầu 6.2L, RapidAir Plus.',2990000,37),
  ('Philips Official Store','Gia dụng','S03P05','Philips Airfryer 3000 Series NA331/00','Nồi chiên không dầu 6.2L phiên bản khác cấu hình.',3190000,34),
  ('Điện Máy Xanh','Gia dụng','S04P01','Xiaomi Robot Vacuum X20 Max','Robot hút bụi lau nhà công suất cao, trạm sạc đa năng.',12990000,20),
  ('Điện Máy Xanh','Gia dụng','S04P02','LG AI Smart TV OLED evo 4K 55 inch','Smart TV OLED 4K với AI và webOS.',29990000,13),
  ('Điện Máy Xanh','Gia dụng','S04P03','Samsung Bespoke AI Wash','Máy giặt cửa trước tích hợp AI và tối ưu chu trình giặt.',18990000,13),
  ('Điện Máy Xanh','Gia dụng','S04P04','Panasonic NanoeX Air Purifier','Máy lọc không khí cho phòng gia đình.',7490000,20),
  ('Điện Máy Xanh','Gia dụng','S04P05','Sharp Plasmacluster Inverter','Điều hòa Inverter tích hợp công nghệ Plasmacluster.',10990000,24),
  ('HP Official Store','Laptop','S05P01','HP OmniBook 5 Laptop Next Gen AI 14-he0048QU','14 inch, Snapdragon X Plus, 16GB RAM, 1TB SSD, 2K OLED.',32990000,14),
  ('HP Official Store','Laptop','S05P02','HP OmniBook X Laptop Next Gen AI 14-ka0074TU','14 inch, Core Ultra 7, 16GB RAM, 1TB SSD, 3K.',39990000,14),
  ('HP Official Store','Laptop','S05P03','HP OmniBook 7 Laptop Next Gen AI 14-hg0034TU','14 inch, Core Ultra X7, 32GB RAM, 1TB SSD, 3K.',47990000,12),
  ('HP Official Store','Laptop','S05P04','HP OmniBook 7 Laptop 14-fs0032TU','14 inch, Intel Core 9, 32GB RAM, 512GB SSD, 2K.',32990000,14),
  ('HP Official Store','Laptop','S05P05','HP OmniBook 7 Laptop AI 14-fr0070TU','14 inch, Core Ultra 7, 16GB RAM, 512GB SSD, 2K.',29990000,16),
  ('GearVN','Laptop','S06P01','ASUS ROG Strix G16 2026','Laptop gaming hiệu năng cao thế hệ mới, màn hình 16 inch.',42990000,14),
  ('GearVN','Laptop','S06P02','Lenovo Legion 5 2026','Laptop gaming 16 inch với cấu hình mạnh cho chơi game và AI.',39990000,13),
  ('GearVN','Laptop','S06P03','Acer Nitro V 16 2026','Laptop gaming 16 inch, hiệu năng/giá cạnh tranh.',28990000,16),
  ('GearVN','Laptop','S06P04','MSI Katana 15 2026','Laptop gaming 15.6 inch cho game và đồ họa.',29990000,14),
  ('GearVN','Laptop','S06P05','ASUS TUF Gaming A16 2026','Laptop gaming bền bỉ với màn hình 16 inch.',31990000,14),
  ('LocknLock Official Store','Nhà bếp','S07P01','LocknLock Air Fryer 7.2L','Nồi chiên không dầu dung tích lớn cho gia đình.',2990000,25),
  ('LocknLock Official Store','Nhà bếp','S07P02','LocknLock Electric Kettle 1.7L','Ấm siêu tốc 1.7L thân inox.',790000,40),
  ('LocknLock Official Store','Nhà bếp','S07P03','LocknLock Vacuum Blender','Máy xay sinh tố hút chân không.',2490000,20),
  ('LocknLock Official Store','Nhà bếp','S07P04','LocknLock Ceramic Pot Set','Bộ nồi phủ ceramic cho bếp gia đình.',3290000,17),
  ('LocknLock Official Store','Nhà bếp','S07P05','LocknLock Toaster 2 Slice','Máy nướng bánh mì 2 khe.',1190000,36),
  ('Kitchen Koncept','Nhà bếp','S08P01','Bosch Series 6 Induction Hob','Bếp từ âm cao cấp cho căn bếp hiện đại.',17990000,10),
  ('Kitchen Koncept','Nhà bếp','S08P02','Tefal Easy Fry & Grill','Nồi chiên kết hợp nướng.',3290000,20),
  ('Kitchen Koncept','Nhà bếp','S08P03','WMF Perfect Plus Pressure Cooker','Nồi áp suất inox cho gia đình.',3990000,14),
  ('Kitchen Koncept','Nhà bếp','S08P04','KitchenAid Artisan Stand Mixer','Máy trộn bột đa năng dòng Artisan.',16990000,8),
  ('Kitchen Koncept','Nhà bếp','S08P05','Philips 5000 Series Blender','Máy xay công suất cao cho sinh tố và bếp gia đình.',3490000,20),
  ('Logitech Official Store','Phụ kiện','S09P01','Logitech MX Master 4','Chuột năng suất chủ lực với native haptic feedback trên Windows 11.',2990000,36),
  ('Logitech Official Store','Phụ kiện','S09P02','Logitech MX Keys S','Bàn phím không dây cho công việc chuyên nghiệp.',2490000,30),
  ('Logitech Official Store','Phụ kiện','S09P03','Logitech MX Anywhere 3S','Chuột không dây nhỏ gọn cho làm việc di động.',1790000,40),
  ('Logitech Official Store','Phụ kiện','S09P04','Logitech G PRO X Superlight 2','Chuột gaming không dây trọng lượng nhẹ.',3690000,32),
  ('Logitech Official Store','Phụ kiện','S09P05','Logitech PRO X2 SUPERSTRIKE','Chuột gaming cao cấp với công nghệ đầu vào mới.',4490000,16),
  ('An Phát Computer','Phụ kiện','S10P01','UGREEN Revodok Pro USB-C Docking Station','Hub mở rộng USB-C cho laptop.',2490000,25),
  ('An Phát Computer','Phụ kiện','S10P02','UGREEN Nexode 100W GaN Charger','Củ sạc GaN công suất 100W.',1890000,30),
  ('An Phát Computer','Phụ kiện','S10P03','ASUS ProArt Display PA279CRV','Màn hình 27 inch 4K dành cho sáng tạo nội dung.',13990000,8),
  ('An Phát Computer','Phụ kiện','S10P04','Kingston XS1000 External SSD','SSD di động nhỏ gọn tốc độ cao.',2190000,30),
  ('An Phát Computer','Phụ kiện','S10P05','TP-Link Wi-Fi 7 Router','Router Wi-Fi 7 cho mạng gia đình tốc độ cao.',4990000,16),
  ('3M Official Store','Vệ sinh nhà cửa','S11P01','3M Scotch-Brite Heavy Duty Scrub Sponge','Miếng cọ rửa bền cho nhà bếp.',59000,240),
  ('3M Official Store','Vệ sinh nhà cửa','S11P02','3M Scotch-Brite Microfiber Cloth','Khăn microfiber lau bề mặt đa năng.',89000,140),
  ('3M Official Store','Vệ sinh nhà cửa','S11P03','3M Command Medium Hooks','Móc treo dán tường không cần khoan.',129000,110),
  ('3M Official Store','Vệ sinh nhà cửa','S11P04','3M Scotch-Brite Floor Cleaning Pad','Miếng lau sàn dùng cho vệ sinh nhà cửa.',159000,90),
  ('3M Official Store','Vệ sinh nhà cửa','S11P05','3M Kitchen Cleaning Gloves','Găng tay vệ sinh dùng trong gia đình.',79000,220),
  ('Bách Hóa Xanh','Vệ sinh nhà cửa','S12P01','Nước Lau Sàn Sunlight Hương Chanh','Nước lau sàn dùng cho vệ sinh nhà cửa.',89000,140),
  ('Bách Hóa Xanh','Vệ sinh nhà cửa','S12P02','Nước Rửa Chén Sunlight Chanh 3.6kg','Nước rửa chén dung tích lớn cho gia đình.',179000,140),
  ('Bách Hóa Xanh','Vệ sinh nhà cửa','S12P03','OMO Comfort Nước Giặt Cửa Trên','Nước giặt cho quần áo gia đình.',199000,120),
  ('Bách Hóa Xanh','Vệ sinh nhà cửa','S12P04','Downy Nước Xả Vải Hương Nước Hoa','Nước xả vải dùng cho giặt máy và giặt tay.',189000,120),
  ('Bách Hóa Xanh','Vệ sinh nhà cửa','S12P05','CeraVe Foaming Facial Cleanser','Sữa rửa mặt dạng gel cho da thường đến da dầu.',329000,70)
)
INSERT INTO products(shop_id,category_id,name,description,price,stock_quantity,status) SELECT sh.id,c.id,sp.product_name,sp.description,sp.price,sp.stock_quantity,'ACTIVE' FROM seed_products sp JOIN shops sh ON sh.name=sp.shop_name JOIN categories c ON c.name=sp.category_name WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.shop_id=sh.id AND p.name=sp.product_name);
INSERT INTO seed_product_map(product_key,product_id) SELECT v.product_key,p.id FROM (VALUES
('S01P01','Samsung Official Store','Samsung Galaxy S26'),
('S01P02','Samsung Official Store','Samsung Galaxy S26+'),
('S01P03','Samsung Official Store','Samsung Galaxy S26 Ultra'),
('S01P04','Samsung Official Store','Samsung Galaxy Buds4'),
('S01P05','Samsung Official Store','Samsung Galaxy Buds4 Pro'),
('S02P01','CellphoneS','Apple iPhone 17'),
('S02P02','CellphoneS','Apple iPhone Air'),
('S02P03','CellphoneS','Apple iPhone 17 Pro'),
('S02P04','CellphoneS','Apple iPhone 17 Pro Max'),
('S02P05','CellphoneS','Apple iPhone 17e'),
('S03P01','Philips Official Store','Philips Airfryer 3000 Series NA340/00'),
('S03P02','Philips Official Store','Philips Airfryer 3000 Series NA341/00'),
('S03P03','Philips Official Store','Philips Airfryer 3000 Series NA351/00'),
('S03P04','Philips Official Store','Philips Airfryer 3000 Series NA330/00'),
('S03P05','Philips Official Store','Philips Airfryer 3000 Series NA331/00'),
('S04P01','Điện Máy Xanh','Xiaomi Robot Vacuum X20 Max'),
('S04P02','Điện Máy Xanh','LG AI Smart TV OLED evo 4K 55 inch'),
('S04P03','Điện Máy Xanh','Samsung Bespoke AI Wash'),
('S04P04','Điện Máy Xanh','Panasonic NanoeX Air Purifier'),
('S04P05','Điện Máy Xanh','Sharp Plasmacluster Inverter'),
('S05P01','HP Official Store','HP OmniBook 5 Laptop Next Gen AI 14-he0048QU'),
('S05P02','HP Official Store','HP OmniBook X Laptop Next Gen AI 14-ka0074TU'),
('S05P03','HP Official Store','HP OmniBook 7 Laptop Next Gen AI 14-hg0034TU'),
('S05P04','HP Official Store','HP OmniBook 7 Laptop 14-fs0032TU'),
('S05P05','HP Official Store','HP OmniBook 7 Laptop AI 14-fr0070TU'),
('S06P01','GearVN','ASUS ROG Strix G16 2026'),
('S06P02','GearVN','Lenovo Legion 5 2026'),
('S06P03','GearVN','Acer Nitro V 16 2026'),
('S06P04','GearVN','MSI Katana 15 2026'),
('S06P05','GearVN','ASUS TUF Gaming A16 2026'),
('S07P01','LocknLock Official Store','LocknLock Air Fryer 7.2L'),
('S07P02','LocknLock Official Store','LocknLock Electric Kettle 1.7L'),
('S07P03','LocknLock Official Store','LocknLock Vacuum Blender'),
('S07P04','LocknLock Official Store','LocknLock Ceramic Pot Set'),
('S07P05','LocknLock Official Store','LocknLock Toaster 2 Slice'),
('S08P01','Kitchen Koncept','Bosch Series 6 Induction Hob'),
('S08P02','Kitchen Koncept','Tefal Easy Fry & Grill'),
('S08P03','Kitchen Koncept','WMF Perfect Plus Pressure Cooker'),
('S08P04','Kitchen Koncept','KitchenAid Artisan Stand Mixer'),
('S08P05','Kitchen Koncept','Philips 5000 Series Blender'),
('S09P01','Logitech Official Store','Logitech MX Master 4'),
('S09P02','Logitech Official Store','Logitech MX Keys S'),
('S09P03','Logitech Official Store','Logitech MX Anywhere 3S'),
('S09P04','Logitech Official Store','Logitech G PRO X Superlight 2'),
('S09P05','Logitech Official Store','Logitech PRO X2 SUPERSTRIKE'),
('S10P01','An Phát Computer','UGREEN Revodok Pro USB-C Docking Station'),
('S10P02','An Phát Computer','UGREEN Nexode 100W GaN Charger'),
('S10P03','An Phát Computer','ASUS ProArt Display PA279CRV'),
('S10P04','An Phát Computer','Kingston XS1000 External SSD'),
('S10P05','An Phát Computer','TP-Link Wi-Fi 7 Router'),
('S11P01','3M Official Store','3M Scotch-Brite Heavy Duty Scrub Sponge'),
('S11P02','3M Official Store','3M Scotch-Brite Microfiber Cloth'),
('S11P03','3M Official Store','3M Command Medium Hooks'),
('S11P04','3M Official Store','3M Scotch-Brite Floor Cleaning Pad'),
('S11P05','3M Official Store','3M Kitchen Cleaning Gloves'),
('S12P01','Bách Hóa Xanh','Nước Lau Sàn Sunlight Hương Chanh'),
('S12P02','Bách Hóa Xanh','Nước Rửa Chén Sunlight Chanh 3.6kg'),
('S12P03','Bách Hóa Xanh','OMO Comfort Nước Giặt Cửa Trên'),
('S12P04','Bách Hóa Xanh','Downy Nước Xả Vải Hương Nước Hoa'),
('S12P05','Bách Hóa Xanh','CeraVe Foaming Facial Cleanser')
) v(product_key,shop_name,product_name) JOIN shops sh ON sh.name=v.shop_name JOIN products p ON p.shop_id=sh.id AND p.name=v.product_name;

-- PRIMARY IMAGES (safe placeholder URLs named after real products)
INSERT INTO product_images(product_id,image_url,is_primary) SELECT pm.product_id, 'https://placehold.co/800x800/fff7ed/ee4d2d?text=' || replace(replace(p.name,' ','+'),'&','%26'), TRUE FROM seed_product_map pm JOIN products p ON p.id=pm.product_id WHERE NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id=pm.product_id AND i.is_primary=TRUE);

-- PRODUCT VARIANTS
INSERT INTO product_variants(product_id,variant_name,price,stock_quantity) SELECT pm.product_id,v.variant_name,v.price,v.stock_quantity FROM (VALUES
('S01P01','256GB / Black',27990000,20),
('S01P01','256GB / Violet',27990000,18),
('S01P01','512GB / Black',31990000,12),
('S01P01','512GB / White',31990000,10),
('S01P02','256GB / Black',31990000,15),
('S01P02','256GB / Cobalt',31990000,15),
('S01P02','512GB / Black',35990000,10),
('S01P02','512GB / White',35990000,8),
('S01P03','256GB / Black',36990000,12),
('S01P03','512GB / Black',39990000,10),
('S01P03','512GB / Silver',39990000,8),
('S01P03','1TB / Black',44990000,5),
('S01P04','White',4990000,25),
('S01P04','Black',4990000,25),
('S01P05','White',6490000,18),
('S01P05','Black',6490000,18),
('S02P01','256GB / Black',24999000,20),
('S02P01','256GB / Lavender',24999000,20),
('S02P01','512GB / White',28999000,12),
('S02P01','512GB / Mist Blue',28999000,10),
('S02P02','256GB / Blue',31999000,15),
('S02P02','256GB / Silver',31999000,15),
('S02P02','512GB / Blue',35999000,8),
('S02P03','256GB / Cosmic Orange',34999000,12),
('S02P03','256GB / Deep Blue',34999000,12),
('S02P03','512GB / Cosmic Orange',40999000,8),
('S02P03','1TB / Deep Blue',46999000,5),
('S02P04','256GB / Cosmic Orange',38999000,10),
('S02P04','512GB / Cosmic Orange',43999000,10),
('S02P04','1TB / Deep Blue',49999000,6),
('S02P04','2TB / Deep Blue',59999000,3),
('S02P05','256GB / Black',17999000,18),
('S02P05','256GB / White',17999000,18),
('S02P05','512GB / Black',21999000,10),
('S03P01','Standard / Black',3990000,20),
('S03P01','Bundle / Black',4290000,10),
('S03P02','Standard / Black',3490000,20),
('S03P02','Bundle / Black',3790000,10),
('S03P03','Standard / Grey',4490000,18),
('S03P03','Bundle / Grey',4790000,10),
('S03P04','Standard',2990000,25),
('S03P04','Pro Bundle',3290000,12),
('S03P05','Standard',3190000,22),
('S03P05','Bundle',3490000,12),
('S04P01','Standard',12990000,12),
('S04P01','Pro Package',14990000,8),
('S04P02','55 inch',29990000,8),
('S04P02','65 inch',39990000,5),
('S04P03','9kg',18990000,8),
('S04P03','12kg',22990000,5),
('S04P04','Standard',7490000,12),
('S04P04','Pro',9490000,8),
('S04P05','1 HP',10990000,10),
('S04P05','1.5 HP',12990000,8),
('S04P05','2 HP',15990000,6),
('S05P01','16GB / 1TB / Silver',32990000,8),
('S05P01','16GB / 1TB / Blue',32990000,6),
('S05P02','16GB / 1TB / Silver',39990000,8),
('S05P02','16GB / 1TB / Blue',39990000,6),
('S05P03','32GB / 1TB / Silver',47990000,7),
('S05P03','32GB / 1TB / Meteor Silver',47990000,5),
('S05P04','32GB / 512GB / Silver',32990000,8),
('S05P04','32GB / 512GB / Blue',32990000,6),
('S05P05','16GB / 512GB / Silver',29990000,10),
('S05P05','16GB / 512GB / Pink',29990000,6),
('S06P01','16GB / 1TB',42990000,8),
('S06P01','32GB / 1TB',47990000,6),
('S06P02','16GB / 512GB',39990000,8),
('S06P02','32GB / 1TB',45990000,5),
('S06P03','16GB / 512GB',28990000,10),
('S06P03','32GB / 1TB',32990000,6),
('S06P04','16GB / 512GB',29990000,9),
('S06P04','32GB / 1TB',33990000,5),
('S06P05','16GB / 512GB',31990000,9),
('S06P05','32GB / 1TB',35990000,5),
('S07P01','7.2L / Black',2990000,15),
('S07P01','7.2L / Cream',2990000,10),
('S07P02','Standard',790000,25),
('S07P02','Pro Temperature',990000,15),
('S07P03','Standard',2490000,12),
('S07P03','Pro',2990000,8),
('S07P04','3 Pieces',3290000,10),
('S07P04','5 Pieces',4290000,7),
('S07P05','White',1190000,18),
('S07P05','Black',1190000,18),
('S08P01','60cm',17990000,6),
('S08P01','80cm',21990000,4),
('S08P02','Standard',3290000,12),
('S08P02','XL',3990000,8),
('S08P03','4.5L',3990000,8),
('S08P03','6.5L',4490000,6),
('S08P04','5KSM185 / Red',16990000,4),
('S08P04','5KSM185 / Black',16990000,4),
('S08P05','Standard',3490000,12),
('S08P05','Pro Jar',3990000,8),
('S09P01','Graphite',2990000,18),
('S09P01','Pale Grey',2990000,18),
('S09P02','Graphite / US',2490000,15),
('S09P02','Pale Grey / US',2490000,15),
('S09P03','Graphite',1790000,20),
('S09P03','White',1790000,20),
('S09P04','Black',3690000,12),
('S09P04','White',3690000,12),
('S09P04','Magenta',3690000,8),
('S09P05','Black',4490000,8),
('S09P05','White',4490000,8),
('S10P01','6-in-1',2490000,15),
('S10P01','10-in-1',3290000,10),
('S10P02','100W / Black',1890000,18),
('S10P02','100W / Silver',1890000,12),
('S10P03','Standard',13990000,5),
('S10P03','Calibrated Bundle',14990000,3),
('S10P04','1TB / Black',2190000,20),
('S10P04','2TB / Black',3790000,10),
('S10P05','Dual Band',4990000,10),
('S10P05','Tri Band Pro',6990000,6),
('S11P01','1 Pack',59000,100),
('S11P01','3 Pack',149000,80),
('S11P01','6 Pack',269000,60),
('S11P02','2 Pack',89000,80),
('S11P02','5 Pack',189000,60),
('S11P03','2 Hooks',129000,60),
('S11P03','4 Hooks',229000,50),
('S11P04','Standard',159000,50),
('S11P04','Pro',239000,40),
('S11P05','M',79000,80),
('S11P05','L',79000,80),
('S11P05','XL',79000,60),
('S12P01','1L',89000,80),
('S12P01','2L',159000,60),
('S12P02','1.5kg',89000,80),
('S12P02','3.6kg',179000,60),
('S12P03','2.2kg',199000,70),
('S12P03','4.4kg',349000,50),
('S12P04','2L',189000,70),
('S12P04','3.8L',299000,50),
('S12P05','236ml',329000,40),
('S12P05','473ml',499000,30)
) v(product_key,variant_name,price,stock_quantity) JOIN seed_product_map pm ON pm.product_key=v.product_key WHERE NOT EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id=pm.product_id AND pv.variant_name=v.variant_name);


-- ================================================================
-- 3C. COUPONS 2026 -> 2027
-- 30 coupon: 6 danh mục x 5 coupon
-- PERCENT / FIXED / FREE_SHIP
-- ================================================================
-- ================================================================
-- RISKMIND AI - COUPON SEED 2026 -> 2027 (FIXED)
-- 6 danh mục x 5 coupon = 30 coupon
-- FREE_SHIP: discount_value = phí vận chuyển tối đa được miễn
-- Không ALTER TYPE trong transaction.
-- ================================================================


WITH seed_coupons(category_name, code, name, discount_type, discount_value, min_order_value, max_discount, usage_limit) AS (
  VALUES
    ('Điện tử', 'ELECP3', 'Giảm 3% Điện tử', 'PERCENT', 3, 5000000, 500000, 1000),
    ('Điện tử', 'ELECP4', 'Giảm 4% Điện tử', 'PERCENT', 4, 10000000, 700000, 700),
    ('Điện tử', 'ELECP5', 'Giảm 5% Điện tử', 'PERCENT', 5, 15000000, 1000000, 500),
    ('Điện tử', 'ELECFIX300', 'Giảm 300K Điện tử', 'FIXED', 300000, 8000000, NULL, 600),
    ('Điện tử', 'ELECSHIP', 'Freeship Điện tử', 'FREE_SHIP', 50000, 300000, 50000, 1500),
    ('Gia dụng', 'HOMEP5', 'Giảm 5% Gia dụng', 'PERCENT', 5, 2000000, 300000, 1200),
    ('Gia dụng', 'HOMEP8', 'Giảm 8% Gia dụng', 'PERCENT', 8, 3000000, 500000, 900),
    ('Gia dụng', 'HOMEP10', 'Giảm 10% Gia dụng', 'PERCENT', 10, 5000000, 700000, 700),
    ('Gia dụng', 'HOMEFIX200', 'Giảm 200K Gia dụng', 'FIXED', 200000, 3000000, NULL, 1000),
    ('Gia dụng', 'HOMESHIP', 'Freeship Gia dụng', 'FREE_SHIP', 50000, 300000, 50000, 1500),
    ('Laptop', 'LAPP3', 'Giảm 3% Laptop', 'PERCENT', 3, 15000000, 700000, 700),
    ('Laptop', 'LAPP4', 'Giảm 4% Laptop', 'PERCENT', 4, 20000000, 1000000, 500),
    ('Laptop', 'LAPP5', 'Giảm 5% Laptop', 'PERCENT', 5, 20000000, 1500000, 500),
    ('Laptop', 'LAPFIX500', 'Giảm 500K Laptop', 'FIXED', 500000, 15000000, NULL, 600),
    ('Laptop', 'LAPSHIP', 'Freeship Laptop', 'FREE_SHIP', 70000, 2000000, 70000, 1200),
    ('Nhà bếp', 'KITCHP5', 'Giảm 5% Nhà bếp', 'PERCENT', 5, 1000000, 150000, 1500),
    ('Nhà bếp', 'KITCHP8', 'Giảm 8% Nhà bếp', 'PERCENT', 8, 1500000, 250000, 1200),
    ('Nhà bếp', 'KITCHP10', 'Giảm 10% Nhà bếp', 'PERCENT', 10, 2000000, 300000, 900),
    ('Nhà bếp', 'KITCHFIX150', 'Giảm 150K Nhà bếp', 'FIXED', 150000, 1500000, NULL, 1200),
    ('Nhà bếp', 'KITCHSHIP', 'Freeship Nhà bếp', 'FREE_SHIP', 50000, 300000, 50000, 1600),
    ('Phụ kiện', 'ACCP10', 'Giảm 10% Phụ kiện', 'PERCENT', 10, 300000, 100000, 1800),
    ('Phụ kiện', 'ACCP15', 'Giảm 15% Phụ kiện', 'PERCENT', 15, 500000, 150000, 1500),
    ('Phụ kiện', 'ACCP20', 'Giảm 20% Phụ kiện', 'PERCENT', 20, 800000, 200000, 1200),
    ('Phụ kiện', 'ACCFIX100', 'Giảm 100K Phụ kiện', 'FIXED', 100000, 500000, NULL, 1600),
    ('Phụ kiện', 'ACCSHIP', 'Freeship Phụ kiện', 'FREE_SHIP', 30000, 150000, 30000, 2000),
    ('Vệ sinh nhà cửa', 'CLEANP8', 'Giảm 8% Vệ sinh nhà cửa', 'PERCENT', 8, 300000, 80000, 1800),
    ('Vệ sinh nhà cửa', 'CLEANP10', 'Giảm 10% Vệ sinh nhà cửa', 'PERCENT', 10, 500000, 120000, 1500),
    ('Vệ sinh nhà cửa', 'CLEANP15', 'Giảm 15% Vệ sinh nhà cửa', 'PERCENT', 15, 700000, 150000, 1100),
    ('Vệ sinh nhà cửa', 'CLEANFIX80', 'Giảm 80K Vệ sinh nhà cửa', 'FIXED', 80000, 400000, NULL, 1600),
    ('Vệ sinh nhà cửa', 'CLEANSHIP', 'Freeship Vệ sinh nhà cửa', 'FREE_SHIP', 30000, 150000, 30000, 2200)
  )
INSERT INTO coupons (
  code, name, discount_type, discount_value, min_order_value,
  max_discount, usage_limit, used_count, start_at, end_at, status
)
SELECT
  s.code,
  s.name,
  s.discount_type::coupon_discount_type,
  s.discount_value,
  s.min_order_value,
  s.max_discount,
  s.usage_limit,
  0,
  TIMESTAMPTZ '2026-08-22 00:00:00+07',
  TIMESTAMPTZ '2027-12-31 23:59:59+07',
  'ACTIVE'::coupon_status
FROM seed_coupons s
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  min_order_value = EXCLUDED.min_order_value,
  max_discount = EXCLUDED.max_discount,
  usage_limit = EXCLUDED.usage_limit,
  start_at = EXCLUDED.start_at,
  end_at = EXCLUDED.end_at,
  status = EXCLUDED.status;

WITH seed_links(category_name, code) AS (
  VALUES
    ('Điện tử', 'ELECP3'),
    ('Điện tử', 'ELECP4'),
    ('Điện tử', 'ELECP5'),
    ('Điện tử', 'ELECFIX300'),
    ('Điện tử', 'ELECSHIP'),
    ('Gia dụng', 'HOMEP5'),
    ('Gia dụng', 'HOMEP8'),
    ('Gia dụng', 'HOMEP10'),
    ('Gia dụng', 'HOMEFIX200'),
    ('Gia dụng', 'HOMESHIP'),
    ('Laptop', 'LAPP3'),
    ('Laptop', 'LAPP4'),
    ('Laptop', 'LAPP5'),
    ('Laptop', 'LAPFIX500'),
    ('Laptop', 'LAPSHIP'),
    ('Nhà bếp', 'KITCHP5'),
    ('Nhà bếp', 'KITCHP8'),
    ('Nhà bếp', 'KITCHP10'),
    ('Nhà bếp', 'KITCHFIX150'),
    ('Nhà bếp', 'KITCHSHIP'),
    ('Phụ kiện', 'ACCP10'),
    ('Phụ kiện', 'ACCP15'),
    ('Phụ kiện', 'ACCP20'),
    ('Phụ kiện', 'ACCFIX100'),
    ('Phụ kiện', 'ACCSHIP'),
    ('Vệ sinh nhà cửa', 'CLEANP8'),
    ('Vệ sinh nhà cửa', 'CLEANP10'),
    ('Vệ sinh nhà cửa', 'CLEANP15'),
    ('Vệ sinh nhà cửa', 'CLEANFIX80'),
    ('Vệ sinh nhà cửa', 'CLEANSHIP')
  )
INSERT INTO coupon_categories (coupon_id, category_id)
SELECT c.id, cat.id
FROM seed_links s
JOIN coupons c ON c.code = s.code
JOIN categories cat ON cat.name = s.category_name
ON CONFLICT (coupon_id, category_id) DO NOTHING;


-- Kiểm tra
SELECT
  c.code,
  c.name,
  c.discount_type,
  c.discount_value,
  c.min_order_value,
  c.max_discount,
  c.usage_limit,
  c.start_at,
  c.end_at,
  c.status,
  cat.name AS category_name
FROM coupons c
JOIN coupon_categories cc ON cc.coupon_id = c.id
JOIN categories cat ON cat.id = cc.category_id
WHERE c.end_at >= TIMESTAMPTZ '2026-08-22 00:00:00+07'
ORDER BY cat.name, c.code;


-- ================================================================
-- 4. SHOPPING + ORDERS + ML / RISK / RECOMMENDATIONS
-- Giữ nguyên dữ liệu hành vi từ seed_ecommerce_risk
-- ================================================================
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

-- ================================================================
-- 12B. TEST DATA
-- Cart / Wishlist / Reviews cho buyer demo
-- ================================================================
-- ================================================================
-- SEED TEST DATA: carts / wishlist / reviews cho user demo
-- Không TRUNCATE — chỉ thêm nếu chưa có. Chạy sau seed chính.
-- Dùng buyer demo: buyer01@riskshop.local
-- ================================================================


DO $$
DECLARE
    v_buyer uuid := '44444444-4444-4444-8444-444444444444'; -- buyer01
    v_cart bigint;
    v_wishlist bigint;
    v_product record;
BEGIN
    -- ===== CART =====
    SELECT id INTO v_cart FROM carts WHERE user_id = v_buyer;
    IF v_cart IS NULL THEN
        INSERT INTO carts (user_id) VALUES (v_buyer) RETURNING id INTO v_cart;
    END IF;

    -- Thêm tối đa 3 sản phẩm ACTIVE vào giỏ (nếu giỏ trống)
    IF NOT EXISTS (SELECT 1 FROM cart_items WHERE cart_id = v_cart) THEN
        FOR v_product IN
            SELECT id, price FROM products WHERE status = 'ACTIVE' LIMIT 3
        LOOP
            INSERT INTO cart_items (cart_id, product_id, quantity, price)
            VALUES (v_cart, v_product.id, 1 + floor(random() * 2)::int, v_product.price);
        END LOOP;
    END IF;

    -- ===== WISHLIST =====
    SELECT id INTO v_wishlist FROM wishlists WHERE user_id = v_buyer;
    IF v_wishlist IS NULL THEN
        INSERT INTO wishlists (user_id) VALUES (v_buyer) RETURNING id INTO v_wishlist;
    END IF;

    -- Thêm 5 sản phẩm vào wishlist (bỏ qua nếu đã có)
    INSERT INTO wishlist_items (wishlist_id, product_id)
    SELECT v_wishlist, id FROM products WHERE status = 'ACTIVE' LIMIT 5
    ON CONFLICT DO NOTHING;

    -- ===== REVIEWS =====
    -- Review cho các đơn DELIVERED/COMPLETED của buyer chưa được review
    INSERT INTO reviews (order_id, product_id, buyer_id, rating, comment)
    SELECT o.id, oi.product_id, o.buyer_id,
           3 + floor(random() * 3)::int,
           'Sản phẩm tốt, đóng gói cẩn thận.'
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.buyer_id = v_buyer
      AND o.status IN ('DELIVERED', 'COMPLETED')
    ON CONFLICT (order_id, product_id, buyer_id) DO NOTHING;

    RAISE NOTICE 'Seed test data OK: cart=%, wishlist=%', v_cart, v_wishlist;
END $$;


-- ================================================================
-- 13. RESET SEQUENCES BỔ SUNG CHO MASTER
-- ================================================================
SELECT setval(pg_get_serial_sequence('coupons','id'), COALESCE((SELECT MAX(id) FROM coupons), 1), true);

-- ================================================================
-- 14. COMMIT MASTER SEED
-- ================================================================
COMMIT;

-- ================================================================
-- 15. KIỂM TRA NHANH
-- ================================================================
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'shops', COUNT(*) FROM shops
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'product_variants', COUNT(*) FROM product_variants
UNION ALL SELECT 'coupons', COUNT(*) FROM coupons
UNION ALL SELECT 'coupon_categories', COUNT(*) FROM coupon_categories
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'buyer_profiles', COUNT(*) FROM buyer_profiles
UNION ALL SELECT 'buyer_features', COUNT(*) FROM buyer_features
UNION ALL SELECT 'risk_predictions', COUNT(*) FROM risk_predictions
UNION ALL SELECT 'recommendations', COUNT(*) FROM recommendations;
