# Ecommerce Transaction Risk Test

Monorepo cho bài toán đánh giá rủi ro giao dịch thương mại điện tử.

## Cấu trúc chuẩn

- `backend/my-nest-api`: API backend bằng NestJS
- `frontend/web/my-react-app`: web app bằng React + Vite
- `frontend/mobile/my_flutter_app`: mobile app bằng Flutter

## Backend

Backend đã được sắp theo hướng thực tế hơn:

- `src/modules`: các domain chính như `auth`, `users`, `transactions`, `risk`
- `src/common`: helper, guard, filter, interceptor, pipe dùng chung
- `src/config`: cấu hình môi trường và cấu hình kỹ thuật
- `src/database`: Prisma và các lớp hạ tầng dữ liệu

## Frontend web

- `src/components`: component dùng lại
- `src/pages`: màn hình chính
- `src/data`: dữ liệu mock hoặc seed UI
- `src/styles`: CSS dùng chung

## Mobile

- `lib/features`: tách theo nghiệp vụ
- `lib/core`: config, theme, networking, utils
- `lib/shared`: widget dùng lại

## Chạy dự án

Mỗi app chạy riêng trong thư mục con:

- Backend: `cd backend/my-nest-api`
- Web: `cd frontend/web/my-react-app`
- Mobile: `cd frontend/mobile/my_flutter_app`
