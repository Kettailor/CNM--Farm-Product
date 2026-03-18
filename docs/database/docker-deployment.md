# Docker deployment

Tài liệu này hướng dẫn chạy toàn bộ dự án bằng Docker gồm:

- `app`: ứng dụng Next.js
- `db`: PostgreSQL 16, tự động import schema `docs/database/farm_traceability_schema.sql`

## 1. Yêu cầu trước khi chạy

Trước khi chạy, hãy chắc chắn Docker daemon đang hoạt động.

### Windows + Docker Desktop

Nếu bạn gặp lỗi kiểu:

```text
error during connect: open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified
```

hoặc:

```text
unable to get image 'cnm-farm-product-traceability-db' ...
```

thì nguyên nhân **không phải do `docker-compose.yml`**, mà là do **Docker Desktop / Docker Engine chưa chạy** hoặc **WSL2 backend chưa sẵn sàng**.

Các bước xử lý:

1. Mở **Docker Desktop**.
2. Chờ tới khi ứng dụng báo `Engine running`.
3. Mở terminal mới rồi kiểm tra:

```bash
docker version
docker info
docker context ls
```

4. Nếu cần, chuyển về context mặc định hoặc context desktop linux:

```bash
docker context use default
# hoặc
docker context use desktop-linux
```

5. Nếu vẫn lỗi, restart Docker Desktop.
6. Nếu bạn dùng WSL2, kiểm tra WSL:

```bash
wsl --status
```

## 2. Cách chạy nhanh nhất

### Windows PowerShell

```powershell
./scripts/docker-up.ps1
```

### macOS / Linux / Git Bash

```bash
./scripts/docker-up.sh
```

Các script này sẽ kiểm tra Docker daemon trước khi chạy `docker compose up --build`.

## 3. Khởi động thủ công

```bash
docker compose up --build
```

Sau khi chạy:

- Web app: `http://localhost:3000`
- PostgreSQL: `localhost:5432`
- Image app: `cnm-farm-product-traceability-app`
- Image db: `cnm-farm-product-traceability-db`
- Database mặc định:
  - DB: `farmhub`
  - User: `farmhub`
  - Password: `farmhub`

## 4. Dừng hệ thống

### PowerShell

```powershell
./scripts/docker-down.ps1
```

### Bash

```bash
./scripts/docker-down.sh
```

Hoặc chạy trực tiếp:

```bash
docker compose down
```

Nếu muốn xoá luôn volume database:

```bash
docker compose down -v
```

## 5. Cách schema được khởi tạo

Service `db` mount file:

- `docs/database/farm_traceability_schema.sql`

vào thư mục:

- `/docker-entrypoint-initdb.d/01_farm_traceability_schema.sql`

PostgreSQL image sẽ tự chạy file này **ở lần khởi tạo volume đầu tiên**.

## 6. Build image app riêng

```bash
docker build -t cnm-farm-product-traceability-app .
```

Chạy image riêng:

```bash
docker run --rm -p 3000:3000 cnm-farm-product-traceability-app
```

## 7. Kiểm tra nhanh sau khi Docker Desktop đã chạy

```bash
docker compose config
docker compose up --build
docker compose ps
```

## 8. Lưu ý triển khai thực tế

- Đổi password DB trước khi dùng production.
- Dùng `.env` hoặc secret manager thay vì hard-code biến môi trường.
- Nếu app bắt đầu dùng DB thật, chỉ cần đọc `DATABASE_URL` từ container `app`.
- Nếu cần migration nâng cấp schema, nên dùng thêm Prisma/Knex/Drizzle/Flyway thay vì chỉ mount file SQL tĩnh.
