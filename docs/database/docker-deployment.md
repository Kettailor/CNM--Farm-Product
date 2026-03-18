# Docker deployment

Tài liệu này hướng dẫn chạy toàn bộ dự án bằng Docker gồm:

- `app`: ứng dụng Next.js
- `db`: PostgreSQL 16, tự động import schema `docs/database/farm_traceability_schema.sql`

## 1. Khởi động

```bash
docker compose up --build
```

Sau khi chạy:

- Web app: `http://localhost:3000`
- PostgreSQL: `localhost:5432`
- Database mặc định:
  - DB: `farmhub`
  - User: `farmhub`
  - Password: `farmhub`

## 2. Dừng hệ thống

```bash
docker compose down
```

Nếu muốn xoá luôn volume database:

```bash
docker compose down -v
```

## 3. Cách schema được khởi tạo

Service `db` mount file:

- `docs/database/farm_traceability_schema.sql`

vào thư mục:

- `/docker-entrypoint-initdb.d/01_farm_traceability_schema.sql`

PostgreSQL image sẽ tự chạy file này **ở lần khởi tạo volume đầu tiên**.

## 4. Build image app riêng

```bash
docker build -t farmhub-app .
```

Chạy image riêng:

```bash
docker run --rm -p 3000:3000 farmhub-app
```

## 5. Lưu ý triển khai thực tế

- Đổi password DB trước khi dùng production.
- Dùng `.env` hoặc secret manager thay vì hard-code biến môi trường.
- Nếu app bắt đầu dùng DB thật, chỉ cần đọc `DATABASE_URL` từ container `app`.
- Nếu cần migration nâng cấp schema, nên dùng thêm Prisma/Knex/Drizzle/Flyway thay vì chỉ mount file SQL tĩnh.
