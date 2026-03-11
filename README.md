# Farm Product Traceability System

Dự án đã được chỉnh lại để phù hợp stack bạn yêu cầu:

- **Frontend:** Next.js + React + Tailwind CSS
- **Backend:** FastAPI (Python)
- **Database:** PostgreSQL
- **Blockchain:** Hyperledger Fabric (private network - profile `fabric`)
- **Containerization:** Docker + Docker Compose
- **Web Server:** Nginx reverse proxy
- **QR System:** Dynamic QR Code bằng Python `segno`

## Cấu trúc chính

- `frontend/`: giao diện Next.js
- `backend/`: API FastAPI + tạo QR SVG
- `deploy/nginx/default.conf`: cấu hình Nginx
- `docker-compose.yml`: orchestration cho toàn hệ thống

## Chạy bằng Docker Compose

```bash
docker compose up --build
```

Ứng dụng chạy qua Nginx tại `http://localhost`.

## Chạy kèm dịch vụ Fabric placeholder

```bash
docker compose --profile fabric up --build
```

> Hai service Fabric (`fabric-orderer`, `fabric-peer`) đang ở dạng placeholder để tích hợp chaincode/msp/network config ở bước tiếp theo.

## Chạy backend riêng (không Docker)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Endpoint mẫu

- `GET /health`
- `GET /api/batches/{batch_code}`
- `GET /api/qr/{batch_code}`

## Khắc phục lỗi frontend config trong Docker

Nếu trước đó container frontend từng chạy với `next.config.ts`, hãy build lại sạch để tránh cache image cũ:

```bash
docker compose down --remove-orphans --rmi local
docker compose build --no-cache frontend
docker compose up --build
```
