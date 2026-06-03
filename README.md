# CNM Farm Product Traceability

[![CI](https://github.com/Kettailor/CNM--Farm-Product-Traceability/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/Kettailor/CNM--Farm-Product-Traceability/actions/workflows/ci.yml)
[![Release](https://github.com/Kettailor/CNM--Farm-Product-Traceability/actions/workflows/release.yml/badge.svg)](https://github.com/Kettailor/CNM--Farm-Product-Traceability/actions/workflows/release.yml)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)
![Version](https://img.shields.io/badge/version-v1.0.0-2f855a)

KetKat-EcoFarm là nền tảng quản trị nông trại và truy xuất nguồn gốc sản phẩm nông nghiệp. Ứng dụng gom dữ liệu trang trại, bản đồ khu vực, vật nuôi, công việc, kho vật tư, hồ sơ vận hành và QR truy xuất vào một dashboard Next.js thống nhất.

## Tính năng chính

- Quản lý tài khoản, đăng nhập, đăng ký trang trại và phân quyền thành viên.
- Dashboard tổng quan tình trạng vận hành, khu vực, vật nuôi, công việc và chỉ số trang trại.
- Bản đồ trang trại với khu vực sản xuất, kho, vùng chăn thả và trạng thái vận hành.
- Quản lý nhóm vật nuôi, cá thể vật nuôi, sự kiện, điều trị và sổ khám bệnh.
- Truy xuất công khai bằng QR cho từng cá thể vật nuôi và bản đồ trang trại public.
- Quản lý kế hoạch chăn thả, lịch sự kiện và biểu đồ Gantt.
- Quản lý công việc, hạng mục, nhắc việc, thông báo thời gian thực và tài liệu đính kèm.
- Quản lý kho vật tư, hồ sơ hóa chất, chứng từ trang trại và lời mời người dùng qua email.
- API health check, Docker Compose, Nginx reverse proxy và Adminer cho môi trường local.

## Tech stack

- **Frontend/App:** Next.js 14 App Router, React 18, TypeScript, Sass/Tailwind, Bootstrap assets.
- **Database:** PostgreSQL 16, schema trong namespace `du_lieu`.
- **Map/Visualization:** MapLibre GL, Leaflet, Recharts.
- **QR/Traceability:** ZXing, jsQR, public livestock URLs.
- **Runtime/Infra:** Node.js 20, Docker, Docker Compose, Nginx, Adminer.
- **Quality:** ESLint, TypeScript typecheck, production build, GitHub Actions CI.

## Yêu cầu môi trường

- Node.js 20.x
- npm 10+
- Docker Desktop hoặc Docker Engine + Docker Compose
- Git

## Cấu hình biến môi trường

Tạo file `.env.local` từ `.env.example` khi chạy ngoài Docker:

```bash
cp .env.example .env.local
```

Các biến quan trọng:

| Biến | Mục đích |
| --- | --- |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL. |
| `APP_URL` | URL server-side dùng để tạo link trong email/API. |
| `NEXT_PUBLIC_APP_URL` | URL public phía client. |
| `NEXT_PUBLIC_APP_NAME` | Tên ứng dụng hiển thị trong một số thông báo. |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | Khóa ký token đăng nhập. Cần đặt giá trị mạnh khi production. |
| `CRON_SECRET` | Token bảo vệ endpoint refresh/maintenance. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Cấu hình gửi email lời mời thành viên. |
| `MAIL_FROM` | Người gửi email. |
| `SUPPORT_EMAIL`, `SUPPORT_PHONE` | Thông tin hỗ trợ trong email. |

Không commit `.env.local` hoặc bất kỳ file `.env.*` thật nào.

## Chạy local bằng npm

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`.

Nếu cần PostgreSQL local, dùng Docker Compose ở phần dưới hoặc tự tạo database rồi import `database/FarmHub_schema.sql`.

## Chạy bằng Docker Compose

```bash
docker compose up --build
```

Các service mặc định:

| Service | URL/Cổng |
| --- | --- |
| App | `http://localhost:3000` |
| Nginx | `http://localhost` |
| PostgreSQL | `127.0.0.1:55432` |
| Adminer | `http://localhost:8080` |

Thông tin PostgreSQL local:

- Database: `farmhub`
- Username: `farmhub`
- Password: `farmhub`
- Host trong Docker network: `db`
- Host từ máy thật: `127.0.0.1`
- Port từ máy thật: `55432`

Script hỗ trợ:

```powershell
./scripts/docker-up.ps1
./scripts/docker-down.ps1
```

```bash
./scripts/docker-up.sh
./scripts/docker-down.sh
```

Reset database sạch từ schema:

```bash
docker compose down -v
docker compose up --build
```

Schema PostgreSQL được mount vào container tại `/docker-entrypoint-initdb.d/00_FarmHub_schema.sql`, nên file schema chỉ tự chạy khi volume database được tạo lần đầu.

## Kiểm tra chất lượng

```bash
npm run lint
npm run typecheck
npm run build
```

Hoặc chạy toàn bộ:

```bash
npm run quality
```

Health check:

```bash
curl http://localhost:3000/api/health
```

Kết quả mong đợi:

```json
{ "ok": true, "service": "KetKat-EcoFarm" }
```

## CI/CD

Repo đã có GitHub Actions:

- `.github/workflows/ci.yml`: chạy lint, typecheck, build Next.js và kiểm tra Docker image trên `dev`, `main` và pull request.
- `.github/workflows/release.yml`: khi push tag dạng `v1.0.0`, workflow build và publish Docker image lên GitHub Container Registry.
- `.github/dependabot.yml`: tự mở PR cập nhật npm dependencies và GitHub Actions hằng tuần.

Quy trình release đề xuất:

```bash
npm version patch --no-git-tag-version
npm run quality
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: release vX.Y.Z"
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin dev --follow-tags
```

Phiên bản hiện tại: `v1.0.0`.

## Cấu trúc dự án

```text
.
├── database/                # Schema PostgreSQL
├── docs/                    # Tài liệu vận hành GitHub/release
├── nginx/                   # Reverse proxy config
├── public/                  # Static assets, logo, upload assets
├── scripts/                 # Helper scripts Docker
├── src/app/                 # Next.js App Router pages và API routes
├── src/components/          # UI components dùng lại
├── src/lib/                 # Database access, auth, schemas, domain services
├── Dockerfile               # Production standalone image
├── docker-compose.yml       # Local app + db + adminer + nginx
└── package.json
```

## GitHub workflow cho team

- Tạo issue bằng template Bug Report, Feature Request hoặc Task.
- Tạo branch từ `dev`, ví dụ `feature/livestock-report` hoặc `fix/qr-lookup`.
- Mở pull request vào `dev` và hoàn thành checklist trong PR template.
- Chỉ merge khi CI xanh và thay đổi đã được review.
- Tạo tag `vX.Y.Z` sau khi đã merge bản release.

Thiết lập repo đề xuất nằm ở `docs/GITHUB_SETUP.md`.

## Bảo mật

- Không commit secrets, file `.env.local`, dump database thật hoặc file upload nhạy cảm.
- Thay `AUTH_SECRET`, `NEXTAUTH_SECRET`, `CRON_SECRET` bằng giá trị mạnh khi deploy.
- Cấu hình SMTP production bằng secrets của nền tảng deploy hoặc GitHub Actions.
- Báo cáo lỗ hổng theo hướng dẫn trong `SECURITY.md`.
