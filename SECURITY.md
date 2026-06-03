# Security Policy

## Supported Versions

| Version | Supported |
| --- | --- |
| `1.x` | Yes |

## Reporting a Vulnerability

Không tạo public issue cho lỗ hổng bảo mật.

Hãy báo cáo riêng cho chủ repo hoặc dùng GitHub Security Advisories nếu repo đã bật tính năng này. Báo cáo nên có:

- Mô tả ngắn gọn lỗ hổng.
- Các bước tái hiện.
- Mức ảnh hưởng dự kiến.
- File, route hoặc API liên quan.
- Gợi ý khắc phục nếu có.

## Secret Handling

- Không commit `.env.local`, `.env.production`, token SMTP, database URL production hoặc secrets deploy.
- Dùng giá trị mạnh cho `AUTH_SECRET`, `NEXTAUTH_SECRET` và `CRON_SECRET` ở production.
- Khi nghi ngờ secret bị lộ, rotate ngay và kiểm tra lại lịch sử Git trước khi publish.
