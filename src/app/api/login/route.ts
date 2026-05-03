import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  cauHinhCookieXacThuc,
  hashDangLegacyMd5,
  kiemTraMatKhau,
  taoMatKhauHash,
  taoTokenXacThuc,
  TEN_COOKIE_XAC_THUC,
} from "@/lib/auth";

type LoginPayload = {
  email: string;
  password: string;
};

async function tableExists(schema: string, table: string) {
  try {
    const rs = await db.query(`select to_regclass($1) is not null as exists`, [`${schema}.${table}`]);
    return Boolean(rs.rows[0]?.exists);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginPayload;
    const email = body?.email?.trim();
    const password = body?.password;

    if (!email || !password) {
      return NextResponse.json({ message: "Vui lòng nhập đầy đủ email và mật khẩu." }, { status: 400 });
    }

    const hasNguoiDung = await tableExists("du_lieu", "nguoi_dung");
    const hasChuSoHuu = await tableExists("du_lieu", "chu_so_huu");
    const hasTrangTrai = await tableExists("du_lieu", "trang_trai");

    const result = hasNguoiDung
      ? await db.query(
          `select c.id, c.ho_ten as full_name, c.email, c.mat_khau_hash as password_hash,
                  exists(
                    select 1
                    from du_lieu.trang_trai t
                    where t.chu_so_huu_id = c.id
                    limit 1
                  ) as has_farm
           from du_lieu.nguoi_dung c
           where c.email = $1
           limit 1`,
          [email]
        )
      : hasChuSoHuu
        ? await db.query(
            `select c.id, c.full_name as full_name, c.email, c.password_hash as password_hash,
                    ${hasTrangTrai ? "exists(select 1 from du_lieu.trang_trai t where t.chu_so_huu_id = c.id limit 1)" : "false"} as has_farm
             from du_lieu.chu_so_huu c
             where c.email = $1
             limit 1`,
            [email]
          )
        : (() => { throw new Error("Không tìm thấy bảng người dùng trong cơ sở dữ liệu."); })();

    if (result.rowCount === 0) {
      return NextResponse.json({ message: "Email hoặc mật khẩu không đúng." }, { status: 401 });
    }

    const user = result.rows[0] as { id: string; full_name: string; email: string; password_hash: string; has_farm: boolean };
    const hopLe = kiemTraMatKhau(password, user.password_hash);
    if (!hopLe) {
      return NextResponse.json({ message: "Email hoặc mật khẩu không đúng." }, { status: 401 });
    }

    if (hasNguoiDung && hashDangLegacyMd5(user.password_hash)) {
      const hashMoi = taoMatKhauHash(password);
      await db.query("update du_lieu.nguoi_dung set mat_khau_hash = $2 where id = $1", [user.id, hashMoi]);
    }

    const token = taoTokenXacThuc(String(user.id));
    const response = NextResponse.json({
      message: "Đăng nhập thành công.",
      user: { id: user.id, fullName: user.full_name, email: user.email },
      nextPath: user.has_farm ? "/dashboard" : "/register/farm",
    });

    response.cookies.set(TEN_COOKIE_XAC_THUC, token, cauHinhCookieXacThuc);
    response.cookies.set("ownerId", "", { ...cauHinhCookieXacThuc, maxAge: 0 });
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        message: "Không thể đăng nhập vào lúc này.",
        error: String(error),
      },
      { status: 500 }
    );
  }
}

