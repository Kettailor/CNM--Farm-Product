import { NextRequest } from "next/server";
import { declineFarmInvitation } from "@/lib/farm-invitations";

function renderResult(title: string, body: string) {
  return new Response(
    `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f6f8; font-family: Arial, Helvetica, sans-serif; color: #111827; }
      main { width: min(520px, calc(100vw - 32px)); background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 28px; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12); }
      h1 { margin: 0 0 12px; font-size: 24px; line-height: 1.25; }
      p { margin: 0 0 22px; color: #475569; line-height: 1.6; }
      a { display: inline-flex; align-items: center; min-height: 42px; padding: 0 18px; border-radius: 6px; background: #56c900; color: #fff; font-weight: 700; text-decoration: none; }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${body}</p>
      <a href="/login">Quay lại đăng nhập</a>
    </main>
  </body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  const token = contentType.includes("application/json")
    ? String(((await request.json()) as { token?: string }).token ?? "")
    : String((await request.formData()).get("token") ?? "");

  const result = await declineFarmInvitation(token);

  if (result.status === "declined") {
    return renderResult("Đã từ chối lời mời", "Cảm ơn bạn đã phản hồi. Chủ sở hữu trang trại đã được thông báo.");
  }
  if (result.status === "expired") {
    return renderResult("Lời mời đã hết hạn", "Lời mời này đã quá hạn và không còn hiệu lực.");
  }
  if (result.status === "already_accepted") {
    return renderResult("Lời mời đã được chấp nhận", "Tài khoản này đã tham gia trang trại trước đó.");
  }
  if (result.status === "already_declined") {
    return renderResult("Lời mời đã được từ chối", "Lời mời này đã được đóng trước đó.");
  }

  return renderResult("Không tìm thấy lời mời", "Liên kết lời mời không hợp lệ hoặc đã bị thay thế.");
}
