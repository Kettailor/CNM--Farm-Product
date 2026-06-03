# Contributing

## Quy trình làm việc

1. Tạo issue hoặc chọn một issue có sẵn.
2. Tạo branch từ `dev`.
3. Cài dependencies bằng `npm install`.
4. Thực hiện thay đổi với phạm vi rõ ràng.
5. Chạy kiểm tra trước khi mở pull request.

```bash
npm run lint
npm run typecheck
npm run build
```

## Quy ước branch

- `feature/<ten-ngan>` cho tính năng mới.
- `fix/<ten-ngan>` cho sửa lỗi.
- `docs/<ten-ngan>` cho tài liệu.
- `chore/<ten-ngan>` cho cấu hình, CI/CD hoặc việc bảo trì.

## Pull request

- PR nên trỏ vào branch `dev`.
- Mô tả rõ thay đổi, ảnh hưởng dữ liệu/database nếu có và cách kiểm tra.
- Không commit `.env.local`, secrets, database dump thật hoặc file upload nhạy cảm.
- Nếu thay đổi schema, cập nhật `database/FarmHub_schema.sql` và ghi chú migration trong PR.

## Release

Phiên bản tuân theo SemVer:

- `MAJOR`: thay đổi phá vỡ tương thích.
- `MINOR`: thêm tính năng tương thích ngược.
- `PATCH`: sửa lỗi hoặc cải tiến nhỏ.

Trước khi tạo tag release, cập nhật `CHANGELOG.md` và chạy `npm run quality`.
