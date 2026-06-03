# CNM Farm Product Traceability

Ứng dụng quản lý nông trại và truy xuất sản phẩm xây dựng bằng Next.js, PostgreSQL và Docker.

## Chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`.

## Kiểm tra chất lượng

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Database

Schema PostgreSQL chuẩn của hệ thống nằm tại:

- `database/FarmHub_schema.sql`

Docker Compose mount file này vào PostgreSQL tại `/docker-entrypoint-initdb.d/00_FarmHub_schema.sql`, nên schema chỉ được bootstrap khi volume database được tạo lần đầu.

Schema ứng dụng hiện dùng namespace `du_lieu`, với các bảng chính như:

- `du_lieu.nguoi_dung`
- `du_lieu.trang_trai`
- `du_lieu.vi_tri_trang_trai`
- `du_lieu.khu_vuc`
- `du_lieu.nhom_vat_nuoi`
- `du_lieu.vat_nuoi`
- `du_lieu.kho_vat_tu`
- `du_lieu.cong_viec`

Để tạo lại database sạch từ schema hiện tại:

```bash
docker compose down -v
docker compose up --build
```

## Docker

```bash
docker compose up --build
```

Hoặc dùng script:

```powershell
./scripts/docker-up.ps1
```

```bash
./scripts/docker-up.sh
```

Dừng hệ thống:

```bash
docker compose down
```

Thông tin kết nối PostgreSQL từ máy host:

- Host: `127.0.0.1`
- Port: `55432`
- Database: `farmhub`
- Username: `farmhub`
- Password: `farmhub`

Adminer chạy tại `http://localhost:8080`:

- System: `PostgreSQL`
- Server: `db`
- Username: `farmhub`
- Password: `farmhub`
- Database: `farmhub`

Trong Adminer, không dùng `localhost` làm server vì Adminer chạy trong container riêng.
