# Docker deployment

Tài liệu này hướng dẫn chạy toàn bộ dự án bằng Docker gồm:

- `app`: ứng dụng Next.js
- `db`: PostgreSQL 16, tự động import schema `docs/database/farm_traceability_schema.sql`
- `adminer` (tùy chọn): giao diện web để xem database dễ hơn

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

## 4. Xem database dễ dàng

### Cách 1: Dùng Adminer trong Docker

Chạy thêm service Adminer:

```bash
docker compose --profile tools up -d adminer
```

Sau đó mở:

- `http://localhost:8080`

Thông tin đăng nhập trong Adminer:

- System: `PostgreSQL`
- Server: `db`
- Username: `farmhub`
- Password: `farmhub`
- Database: `farmhub`

> Không dùng `localhost` ở ô **Server** của Adminer. Adminer chạy trong container riêng, nên `localhost` sẽ trỏ về chính container Adminer và gây lỗi `connection refused` tới PostgreSQL.

Sau khi đăng nhập Adminer, bạn có thể xem nhanh thông tin database như sau:

- **Databases**: xem danh sách database trên PostgreSQL server.
- **Schema** / **Tables and views**: xem schema, bảng, view.
- Chọn một **table** để xem:
  - cấu trúc cột
  - khóa chính / index
  - foreign key / liên kết giữa các bảng
  - dữ liệu hiện có
- **SQL command**: chạy query tự do để inspect dữ liệu hoặc quan hệ bảng.

Ví dụ query:

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;
```

```sql
SELECT
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
 AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_schema, tc.table_name, kcu.column_name;
```

Nếu bạn thích terminal hơn, có thể vào PostgreSQL container rồi dùng `psql`:

```bash
docker compose exec db psql -U farmhub -d farmhub
```

Các lệnh hữu ích trong `psql`:

- `\l` → danh sách database
- `\dn` → danh sách schema
- `\dt farm.*` → danh sách bảng trong schema `farm`
- `\d farm.ten_bang` → xem cột, index, foreign key của một bảng
- `\q` → thoát

### Nếu không thấy database / table nào

Các nguyên nhân thường gặp:

1. Bạn đang login sai server trong Adminer. Hãy dùng `Server = db`, không dùng `localhost`.
2. Bạn đang mở schema `public`, trong khi project này tạo bảng ở schema `farm`.
3. Volume `postgres_data` đã được tạo từ trước, nên file init SQL không chạy lại. PostgreSQL chỉ chạy script trong `/docker-entrypoint-initdb.d/` ở lần khởi tạo volume đầu tiên.

Cách kiểm tra nhanh bằng `psql`:

```bash
docker compose exec db psql -U farmhub -d farmhub -c "\dn"
docker compose exec db psql -U farmhub -d farmhub -c "\dt farm.*"
```

Nếu kết quả chưa có bảng và bạn muốn khởi tạo lại từ đầu:

```bash
docker compose down -v
docker compose up --build
```

> Lưu ý: `docker compose down -v` sẽ xoá luôn volume database hiện tại.

Nếu bạn không muốn xoá volume, có thể import lại schema thủ công:

```bash
docker compose exec -T db psql -U farmhub -d farmhub < docs/database/farm_traceability_schema.sql
```

Sau đó kiểm tra lại:

```bash
docker compose exec db psql -U farmhub -d farmhub -c "\dt farm.*"
```

### Cách 2: Dùng VS Code extension

Nếu bạn thích xem schema/table ngay trong VS Code, nên dùng:

- **SQLTools**
- **SQLTools PostgreSQL/Cockroach Driver**

Thiết lập connection:

- Host: `127.0.0.1`
- Port: `5432`
- Database: `farmhub`
- Username: `farmhub`
- Password: `farmhub`

Sau khi kết nối, bạn có thể:

- xem schema `farm`
- duyệt tables/views
- chạy query SQL
- inspect columns, constraints, indexes

### Cách 3: Dùng extension PostgreSQL riêng của VS Code

Bạn cũng có thể dùng extension PostgreSQL bất kỳ miễn kết nối được tới:

```text
postgresql://farmhub:farmhub@127.0.0.1:5432/farmhub
```

## 5. Dừng hệ thống

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

## 6. Cách schema được khởi tạo

Service `db` mount file:

- `docs/database/farm_traceability_schema.sql`

vào thư mục:

- `/docker-entrypoint-initdb.d/01_farm_traceability_schema.sql`

PostgreSQL image sẽ tự chạy file này **ở lần khởi tạo volume đầu tiên**.

## 7. Build image app riêng

```bash
docker build -t cnm-farm-product-traceability-app .
```

Chạy image riêng:

```bash
docker run --rm -p 3000:3000 cnm-farm-product-traceability-app
```

## 8. Kiểm tra nhanh sau khi Docker Desktop đã chạy

```bash
docker compose config
docker compose up --build
docker compose ps
```

## 9. Lưu ý triển khai thực tế

- Đổi password DB trước khi dùng production.
- Dùng `.env` hoặc secret manager thay vì hard-code biến môi trường.
- Nếu app bắt đầu dùng DB thật, chỉ cần đọc `DATABASE_URL` từ container `app`.
- Nếu cần migration nâng cấp schema, nên dùng thêm Prisma/Knex/Drizzle/Flyway thay vì chỉ mount file SQL tĩnh.
