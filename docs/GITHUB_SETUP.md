# GitHub Setup

Tài liệu này dùng để hoàn thiện giao diện và quy trình vận hành repo trên GitHub.

## Repository metadata

Gợi ý phần About:

- Description: `Next.js farm management and product traceability platform for KetKat-EcoFarm.`
- Website: URL production nếu đã deploy.
- Topics: `nextjs`, `typescript`, `postgresql`, `docker`, `farm-management`, `traceability`, `qr-code`, `agritech`.

## Branch protection

Nên bật rule cho `dev` và `main`:

- Require a pull request before merging.
- Require status checks to pass before merging.
- Required checks: `validate` và `docker-build` trong workflow `CI`.
- Require branches to be up to date before merging.
- Block force pushes.

## Labels đề xuất

File `.github/labels.yml` có danh sách label chuẩn. Có thể tạo thủ công trên GitHub hoặc đồng bộ bằng GitHub CLI:

```bash
gh label create "type: bug" --color d73a4a --description "Lỗi hoặc regression"
gh label create "type: feature" --color 0e8a16 --description "Tính năng mới"
gh label create "type: docs" --color 0075ca --description "Tài liệu"
gh label create "area: frontend" --color 1d76db --description "UI hoặc Next.js pages"
gh label create "area: api" --color 5319e7 --description "API routes hoặc business logic"
gh label create "area: database" --color fbca04 --description "Schema hoặc dữ liệu PostgreSQL"
gh label create "area: devops" --color c2e0c6 --description "Docker, CI/CD hoặc deploy"
gh label create "priority: high" --color b60205 --description "Cần xử lý sớm"
gh label create "priority: medium" --color fbca04 --description "Mức ưu tiên trung bình"
gh label create "priority: low" --color 0e8a16 --description "Có thể xử lý sau"
```

## Secrets cho CI/CD

Workflow hiện tại dùng `GITHUB_TOKEN` để publish GHCR khi push tag. Nếu deploy lên server riêng, nên thêm các secrets sau tùy môi trường:

- `DATABASE_URL`
- `APP_URL`
- `NEXT_PUBLIC_APP_URL`
- `AUTH_SECRET`
- `CRON_SECRET`
- `SMTP_HOST`
- `SMTP_USER`
- `SMTP_PASS`
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_KEY`

## Release checklist

1. Cập nhật version trong `package.json`.
2. Cập nhật `CHANGELOG.md`.
3. Chạy `npm run quality`.
4. Commit thay đổi release.
5. Tạo tag annotated, ví dụ `git tag -a v1.0.0 -m "Release v1.0.0"`.
6. Push branch và tag: `git push origin dev --follow-tags`.
7. Kiểm tra workflow `Release` và package trên GitHub Container Registry.
