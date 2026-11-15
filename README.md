# RiskMind

Website thương mại điện tử tích hợp **chương trình khách hàng thân thiết**, quản trị cửa hàng và đánh giá rủi ro đơn hàng. Ứng dụng Flutter sử dụng chung Backend API với website.

## Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Website | React, Vite, JavaScript/JSX, React Router, Bootstrap |
| Backend | NestJS, TypeScript, Prisma ORM 7 |
| Cơ sở dữ liệu | Microsoft SQL Server |
| Mobile | Flutter, Dart |
| Cache tùy chọn | Redis |
| Email tùy chọn | Resend API |
| Dịch vụ đánh giá rủi ro | Python, FastAPI, scikit-learn |

## Chức năng

### Khách hàng

- Đăng ký, đăng nhập, quản lý hồ sơ, sổ địa chỉ và khôi phục mật khẩu.
- Xem sản phẩm, danh mục, cửa hàng; tìm kiếm, yêu thích và quản lý giỏ hàng.
- Đặt hàng, áp dụng mã giảm giá và theo dõi trạng thái đơn hàng.
- Nhận thông báo và xem lịch sử giao dịch.
- Tự động tạo hồ sơ thành viên khi đăng ký tài khoản khách hàng.
- Theo dõi điểm, hạng, quyền lợi, điểm hết hạn và lịch sử điểm.
- Đổi điểm lấy phần thưởng, sử dụng phiếu ưu đãi cá nhân.
- Gửi và theo dõi khiếu nại KHTT.

### Người bán

- Tổng quan và biểu đồ bán hàng trong phạm vi cửa hàng được cấp quyền.
- Quản lý sản phẩm, tồn kho và đơn hàng.
- Tra cứu mã giảm giá, phân tích bán hàng và cảnh báo rủi ro.

### Quản trị viên

- Tổng quan hệ thống, biểu đồ đơn hàng và trạng thái giao dịch.
- Quản lý tài khoản, cửa hàng, danh mục, sản phẩm, đơn hàng và mã giảm giá.
- Quản lý thành viên, phiên bản chính sách tích điểm, hạng và quyền lợi.
- Tạo, chỉnh sửa và bật/tắt phần thưởng.
- Điều chỉnh điểm trực tiếp hoặc lưu yêu cầu chờ xử lý; mọi thay đổi có lý do và nhật ký.
- Xử lý khiếu nại; tra cứu nhật ký và so sánh dữ liệu trước/sau.
- Theo dõi mô hình, kết quả đánh giá rủi ro và cài đặt hệ thống.

## Cấu trúc mã nguồn

```text
backend/
  src/                      # Module nghiệp vụ, controller, service và DTO
  prisma/
    schema.prisma           # Schema SQL Server
    migrations-sqlserver/   # Migration triển khai
  scripts/                  # Triển khai DB và công cụ vận hành
  public/products/          # Ảnh sản phẩm
frontend/
  web/src/
    accounts/               # Tài khoản và xác thực
    shop/                   # Mua sắm và đơn hàng
    seller/                 # Khu vực người bán
    admin/                  # Khu vực quản trị
    loyalty/                # Khách hàng thân thiết
    common/                 # API, layout, biểu đồ và giao diện dùng chung
  mobile/lib/               # Ứng dụng Flutter
ml/                         # Đặc trưng và công cụ chuẩn bị dữ liệu
ml-service/                 # Huấn luyện và API đánh giá rủi ro
```

Trong `backend/src`, controller, service và DTO nằm cạnh nhau theo nhóm nghiệp vụ. Các phần nhỏ dùng chung được gom như sau:

| File | Nội dung |
| --- | --- |
| `auth/auth.decorators.ts` | Vai trò, metadata xác thực và lấy người dùng hiện tại |
| `auth/auth.guards.ts` | Kiểm tra phiên đăng nhập và quyền truy cập |
| `users/users.dto.ts` | Dữ liệu hồ sơ và sổ địa chỉ |
| `orders/orders.dto.ts` | Dữ liệu tạo đơn, báo giá, truy vấn và cập nhật trạng thái |
| `admin/admin.dto.ts` | Dữ liệu quản lý người dùng, danh mục và sản phẩm |
| `payments/payment-signatures.ts` | Ký và xác minh giao dịch MoMo, VNPay |

API rủi ro tập trung trong `risk/risk.controller.ts`; API thống kê quản trị và người bán nằm trong `statistics/statistics.controller.ts`. Các service xử lý đơn hàng, thanh toán và sổ điểm được giữ riêng theo nghiệp vụ.

## Chạy trên máy phát triển

### 1. Chuẩn bị

- Node.js 24 và npm.
- SQL Server và công cụ quản lý như SSMS.
- Flutter SDK tương thích với `frontend/mobile/pubspec.yaml` nếu chạy mobile.
- Python và môi trường ảo nếu sử dụng dịch vụ ML.

Chạy các lệnh npm trong đúng thư mục `backend` hoặc `frontend/web`. Không cần cài dependency ở thư mục gốc.

### 2. Backend và SQL Server

Trong PowerShell, từ thư mục dự án:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
```

Chỉ sao chép `.env.example` khi chưa có `.env`. Cấu hình các biến `SQLSERVER_*`, `DATABASE_URL` và `JWT_SECRET` trong `.env` theo môi trường của bạn. Với Windows Authentication, dùng `SQLSERVER_AUTH=windows`; SQL Server cần driver ODBC phù hợp. Với SQL Login hoặc môi trường Linux/Docker, dùng `SQLSERVER_AUTH=sql` và thông tin đăng nhập riêng.

```powershell
npx prisma generate
npm run db:deploy
npm run start:dev
```

- API mặc định: `http://localhost:3000`.
- Kiểm tra hoạt động: `GET /health`.
- `db:deploy` áp dụng migration SQL Server và chính sách khởi tạo; không cung cấp dữ liệu khách hàng hoặc đơn hàng riêng của máy phát triển.
- Dùng `start:dev` để tự biên dịch lại khi sửa Backend.

Đăng ký công khai chỉ tạo khách hàng. Có thể tạo tài khoản quản trị demo trên môi trường local bằng:

```powershell
npm run loyalty:admins -- --demo
```

Thông tin được lưu trong `backend/.local/loyalty-admins.json`, không đưa lên Git. Không sử dụng tài khoản demo cho môi trường công khai.

### 3. Website

Mở terminal khác, từ thư mục dự án:

```powershell
cd frontend/web
npm ci
Copy-Item .env.example .env
npm run dev
```

Website mặc định: `http://localhost:5173`. Vite chuyển tiếp yêu cầu `/api` đến `http://127.0.0.1:3000`. Nếu cổng 5173 đã bị chiếm, kiểm tra địa chỉ thực tế Vite hiển thị.

| Khu vực | Đường dẫn |
| --- | --- |
| Trang chủ | `/` |
| Đăng nhập / đăng ký | `/dang-nhap`, `/dang-ky` |
| Quên mật khẩu | `/quen-mat-khau` |
| Sản phẩm / cửa hàng | `/san-pham`, `/cua-hang` |
| Giỏ hàng / thanh toán | `/gio-hang`, `/thanh-toan` |
| Đơn hàng | `/don-hang` |
| KHTT khách hàng | `/khach-hang-than-thiet` |
| Quản trị hệ thống | `/quan-tri` |
| Quản trị KHTT | `/quan-tri/khach-hang-than-thiet` |
| Người bán | `/nguoi-ban` |

Chi tiết các route và quyền truy cập nằm trong `frontend/web/src/App.jsx`.

### 4. Mobile

```powershell
cd frontend/mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

`10.0.2.2` dùng cho Android Emulator. Với điện thoại thật, thay bằng IP mạng LAN của máy chạy Backend và bảo đảm thiết bị truy cập được cổng API.

### 5. Dịch vụ ML tùy chọn

Từ thư mục gốc, tạo môi trường ảo và cài dependency:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r ml-service/requirements.txt
cd ml-service
uvicorn app:app --host 127.0.0.1 --port 8000
```

Cấu hình kết nối SQL Server, ODBC Driver và `ML_SERVICE_TOKEN` trước khi sử dụng. Suy luận ML yêu cầu mô hình hợp lệ và đủ lịch sử giao dịch. Repository không chứa dataset riêng hoặc mô hình đã huấn luyện của máy phát triển.

## Quy tắc KHTT

- Điểm phát sinh từ đơn hàng đủ điều kiện theo trạng thái và thanh toán; đối soát lại không cộng trùng.
- Giá trị xét điểm không gồm phí vận chuyển và tuân theo điều kiện giảm giá.
- Mỗi giao dịch lưu phiên bản chính sách đã áp dụng. Chính sách đã công bố không được chỉnh sửa trực tiếp.
- Đổi thưởng kiểm tra số dư, số lượng và điều kiện áp dụng; phiếu cá nhân chỉ dành cho chủ sở hữu.
- Phiếu đã cấp giữ nguyên điều kiện dù phần thưởng gốc được chỉnh sửa.
- Có xử lý điểm hết hạn, thu hồi điểm và chu kỳ xét hạng. Thu hồi có thể tạo số dư cần bù; điểm khả dụng không âm.
- Điều chỉnh và xử lý khiếu nại được ghi nhật ký. Các thao tác quan trọng dùng transaction, khóa và kiểm tra phiên bản.
- Tác vụ đối soát chạy trong Backend; dữ liệu có thể cập nhật sau một chu kỳ xử lý.

## Dịch vụ cần cấu hình riêng

- **Redis:** bật bằng `REDIS_URL`; dùng cache danh sách phần thưởng, SQL Server vẫn là nguồn dữ liệu chính.
- **Email:** `MAIL_TRANSPORT=file` chỉ lưu thư local trong `backend/.local/mail-outbox`. Để gửi email thật, cấu hình `MAIL_TRANSPORT=resend`, `RESEND_API_KEY` và `MAIL_FROM` hợp lệ.
- **Thanh toán:** MoMo/VNPay yêu cầu tài khoản sandbox/merchant và callback phù hợp. Có mã tích hợp không đồng nghĩa dịch vụ đã được kích hoạt.

## Build và triển khai

Backend:

```powershell
cd backend
npm run build
npm run start:prod
```

Website:

```powershell
cd frontend/web
npm run build
```

Có sẵn `Dockerfile`, `compose.loyalty.yml` và `render.yaml` làm cấu hình triển khai. Với Docker Compose, tạo `.env.docker` từ `.env.docker.example`, thiết lập mật khẩu, khóa và xác nhận điều khoản SQL Server trước khi chạy:

```powershell
docker compose --env-file .env.docker -f compose.loyalty.yml up --build -d
```

Compose khởi chạy SQL Server, Redis, migration, API và website. Hosting công khai cần database, biến môi trường, HTTPS và tài khoản dịch vụ được cấu hình riêng; việc đẩy mã lên GitHub không tự đưa website lên hosting.

## Kiểm tra mã

- Backend: `npm run lint`, `npm run typecheck`, `npm run build`.
- Web: `npm run lint`, `npm run build`.
- Mobile: `dart analyze lib`, `flutter build bundle --no-pub` sau `flutter pub get`.

## Phạm vi repository

Repository công khai gồm mã nguồn sản phẩm, migration, ảnh sản phẩm và cấu hình mẫu. `.env` thực tế, mật khẩu, khóa, bản sao lưu database, dataset riêng, test, ghi chú, báo cáo và sơ đồ nội bộ được bỏ qua bằng `.gitignore`.

Không đưa dữ liệu cá nhân hoặc tài khoản demo local lên môi trường công khai. Kiểm thử tải, bảo mật và cấu hình dịch vụ thực tế cần được thực hiện trước khi vận hành production.
