import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cauHinhCookieXacThuc, taoMatKhauHash, taoTokenXacThuc, TEN_COOKIE_XAC_THUC } from "@/lib/auth";

type Payload = {
  fullName: string;
  email: string;
  password: string;
  inviteToken?: string;
};

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

class RegisterAccountError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function completeInviteRegistration(fullName: string, email: string, password: string, inviteToken: string) {
  const client = await db.connect();
  try {
    await client.query("begin");

    const invite = await client.query(
      `select id::text, trang_trai_id::text, vai_tro_id::text
       from du_lieu.loi_moi_trang_trai
       where token = $1
         and lower(email) = $2
         and lower(trang_thai) = 'pending'
         and (het_han_luc is null or het_han_luc > now())
       limit 1`,
      [inviteToken, email]
    );
    const inviteRow = invite.rows[0] as { id?: string; trang_trai_id?: string; vai_tro_id?: string | null } | undefined;
    if (!inviteRow?.id || !inviteRow.trang_trai_id || !inviteRow.vai_tro_id) {
      throw new RegisterAccountError("Lời mời không hợp lệ hoặc đã hết hạn.", 400);
    }

    const passwordHash = taoMatKhauHash(password);
    const existing = await client.query(
      `select id::text
       from du_lieu.nguoi_dung
       where lower(email) = $1
       limit 1`,
      [email]
    );

    let userId = existing.rows[0]?.id ? String(existing.rows[0].id) : null;
    if (userId) {
      await client.query(
        `update du_lieu.nguoi_dung
         set ho_ten = $2,
             mat_khau_hash = $3,
             trang_thai = 'active',
             updated_at = now()
         where id = $1`,
        [userId, fullName, passwordHash]
      );
    } else {
      const created = await client.query(
        `insert into du_lieu.nguoi_dung (ho_ten, email, mat_khau_hash, trang_thai)
         values ($1, $2, $3, 'active')
         returning id::text`,
        [fullName, email, passwordHash]
      );
      userId = String(created.rows[0].id);
    }

    await client.query(
      `insert into du_lieu.thanh_vien_trang_trai
         (trang_trai_id, nguoi_dung_id, vai_tro_id, trang_thai, metadata_json)
       values ($1, $2, $3, 'active', $4::jsonb)
       on conflict (trang_trai_id, nguoi_dung_id) do update
       set vai_tro_id = excluded.vai_tro_id,
           trang_thai = 'active',
           metadata_json = du_lieu.thanh_vien_trang_trai.metadata_json || excluded.metadata_json,
           updated_at = now()`,
      [inviteRow.trang_trai_id, userId, inviteRow.vai_tro_id, JSON.stringify({ source: "invite", invite_id: inviteRow.id })]
    );

    await client.query(
      `update du_lieu.loi_moi_trang_trai
       set trang_thai = 'accepted',
           updated_at = now()
       where id = $1`,
      [inviteRow.id]
    );

    await client.query("commit");

    return {
      id: userId,
      full_name: fullName,
      email,
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Payload;
    const fullName = body?.fullName?.trim();
    const email = body?.email?.trim().toLowerCase();
    const password = body?.password ?? "";
    const inviteToken = body?.inviteToken?.trim();

    if (!fullName || !email || !password) {
      return NextResponse.json({ message: "Vui lòng nhập đầy đủ thông tin." }, { status: 400 });
    }
    if (!isEmail(email)) {
      return NextResponse.json({ message: "Email không hợp lệ." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ message: "Mật khẩu phải có ít nhất 8 ký tự." }, { status: 400 });
    }

    if (inviteToken) {
      const user = await completeInviteRegistration(fullName, email, password, inviteToken);
      const token = taoTokenXacThuc(String(user.id));
      const response = NextResponse.json({ message: "Đã chấp nhận lời mời và tạo mật khẩu thành công.", user, nextPath: "/dashboard" });
      response.cookies.set(TEN_COOKIE_XAC_THUC, token, cauHinhCookieXacThuc);
      response.cookies.set("ownerId", "", { ...cauHinhCookieXacThuc, maxAge: 0 });
      return response;
    }

    const existed = await db.query("select id from du_lieu.nguoi_dung where lower(email) = $1 limit 1", [email]);
    if (existed.rowCount) {
      return NextResponse.json({ message: "Email đã tồn tại trong hệ thống. Vui lòng dùng email khác." }, { status: 409 });
    }

    const passwordHash = taoMatKhauHash(password);
    const result = await db.query(
      `insert into du_lieu.nguoi_dung (ho_ten, email, mat_khau_hash)
       values ($1, $2, $3)
       returning id, ho_ten, email`,
      [fullName, email, passwordHash]
    );

    const user = result.rows[0] as { id: string; full_name: string; email: string };
    const token = taoTokenXacThuc(String(user.id));
    const response = NextResponse.json({ message: "Tạo tài khoản thành công.", user, nextPath: "/register/farm" });
    response.cookies.set(TEN_COOKIE_XAC_THUC, token, cauHinhCookieXacThuc);
    response.cookies.set("ownerId", "", { ...cauHinhCookieXacThuc, maxAge: 0 });
    return response;
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể tạo tài khoản.", error: String(error) },
      { status: error instanceof RegisterAccountError ? error.status : 500 }
    );
  }
}
