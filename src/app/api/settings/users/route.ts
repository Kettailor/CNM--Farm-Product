import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { layOwnerIdTuServerCookie, taoMatKhauHash } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadSettingsProfile } from "@/lib/settings-overview";
import { ensureFarmSettingsDefaults, ensureSettingsSchema } from "@/lib/settings-schema";

type RoleCode = "none" | "viewer" | "editor" | "admin";

type AddUserPayload = {
  farm_id?: string | null;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  language?: string;
  account_enabled?: boolean;
  base_role?: RoleCode;
  farm_role?: RoleCode;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_CODES = new Set<RoleCode>(["none", "viewer", "editor", "admin"]);
const COUNTRY_ONLY_PHONE_DIGITS = new Set(["1", "61", "84"]);
const MIN_PHONE_DIGITS = 7;

class AddUserError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRole(value: unknown): RoleCode {
  const cleanValue = cleanText(value).toLowerCase() as RoleCode;
  return ROLE_CODES.has(cleanValue) ? cleanValue : "none";
}

function buildFullName(firstName: string, lastName: string, email: string) {
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || email.split("@")[0] || "Nguoi dung";
}

function makeTemporaryPasswordHash() {
  return taoMatKhauHash(randomBytes(24).toString("base64url"));
}

function getPhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function buildPhoneLookupDigits(value: string) {
  const rawDigits = getPhoneDigits(value);
  if (!rawDigits || COUNTRY_ONLY_PHONE_DIGITS.has(rawDigits)) return [];

  const digits = new Set([rawDigits]);
  if (rawDigits.startsWith("840") && rawDigits.length > 3) {
    digits.add(`84${rawDigits.slice(3)}`);
    digits.add(`0${rawDigits.slice(3)}`);
  } else if (rawDigits.startsWith("84") && rawDigits.length > 2) {
    digits.add(`0${rawDigits.slice(2)}`);
    digits.add(`840${rawDigits.slice(2)}`);
  } else if (rawDigits.startsWith("0") && rawDigits.length > 1) {
    digits.add(`84${rawDigits.slice(1)}`);
    digits.add(`840${rawDigits.slice(1)}`);
  }

  return Array.from(digits).filter((digitsValue) => digitsValue.length >= MIN_PHONE_DIGITS);
}

function normalizePhoneForStorage(value: string) {
  const rawDigits = getPhoneDigits(value);
  if (!rawDigits || COUNTRY_ONLY_PHONE_DIGITS.has(rawDigits)) return null;
  if (rawDigits.length < MIN_PHONE_DIGITS) {
    throw new AddUserError("Số điện thoại không hợp lệ.", 400);
  }

  if (rawDigits.startsWith("840") && rawDigits.length > 3) return `+84${rawDigits.slice(3)}`;
  if (rawDigits.startsWith("84") && rawDigits.length > 2) return `+${rawDigits}`;
  if (rawDigits.startsWith("0") && rawDigits.length > 1) return `+84${rawDigits.slice(1)}`;
  if (value.trim().startsWith("+")) return `+${rawDigits}`;
  return rawDigits;
}

function isPgUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";
}

export async function POST(request: NextRequest) {
  try {
    const ownerId = layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });

    await ensureSettingsSchema();

    const body = (await request.json()) as AddUserPayload;
    const farmId = cleanText(body.farm_id);
    const firstName = cleanText(body.first_name);
    const lastName = cleanText(body.last_name);
    const email = cleanText(body.email).toLowerCase();
    const phone = cleanText(body.phone);
    const normalizedPhone = normalizePhoneForStorage(phone);
    const phoneLookupDigits = buildPhoneLookupDigits(phone);
    const language = cleanText(body.language) || "vi-VN";
    const accountEnabled = body.account_enabled !== false;
    const baseRole = normalizeRole(body.base_role);
    const farmRole = normalizeRole(body.farm_role);
    const effectiveRole = farmRole !== "none" ? farmRole : baseRole !== "none" ? baseRole : null;

    if (!farmId) {
      return NextResponse.json({ message: "Không tìm thấy trang trại để phân quyền." }, { status: 400 });
    }
    if (!email || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ message: "Email không hợp lệ." }, { status: 400 });
    }
    if (!effectiveRole) {
      return NextResponse.json({ message: "Vui lòng chọn ít nhất một vai trò cho người dùng." }, { status: 400 });
    }

    const client = await db.connect();
    try {
      await client.query("begin");

      const farm = await client.query(
        `select id
         from du_lieu.trang_trai
         where id = $1 and chu_so_huu_id = $2
         limit 1`,
        [farmId, ownerId]
      );
      if (farm.rowCount === 0) {
        throw new AddUserError("Bạn không có quyền phân quyền cho trang trại này.", 403);
      }

      await ensureFarmSettingsDefaults(farmId, ownerId);

      const existingUser = await client.query(
        `select id::text, email, so_dien_thoai
         from du_lieu.nguoi_dung
         where lower(email) = $1
         order by created_at asc nulls last, id asc
         limit 1`,
        [email]
      );
      const existingUserId = existingUser.rows[0]?.id ? String(existingUser.rows[0].id) : null;
      if (existingUserId === ownerId) {
        throw new AddUserError("Tài khoản chủ sở hữu đã có quyền quản trị trang trại.", 409);
      }

      if (phoneLookupDigits.length > 0) {
        const phoneParams: unknown[] = [phoneLookupDigits];
        const excludeExistingUser = existingUserId ? "and id <> $2::uuid" : "";
        if (existingUserId) phoneParams.push(existingUserId);

        const duplicatedPhone = await client.query(
          `select id::text, email
           from du_lieu.nguoi_dung
           where nullif(so_dien_thoai, '') is not null
             and regexp_replace(so_dien_thoai, '\\D', '', 'g') = any($1::text[])
             ${excludeExistingUser}
           limit 1`,
          phoneParams
        );

        if ((duplicatedPhone.rowCount ?? 0) > 0) {
          throw new AddUserError("Số điện thoại đã tồn tại trong hệ thống. Vui lòng dùng số khác.", 409);
        }
      }

      const existingMember = existingUserId
        ? await client.query(
            `select id
             from du_lieu.thanh_vien_trang_trai
             where trang_trai_id = $1 and nguoi_dung_id = $2
             limit 1`,
            [farmId, existingUserId]
          )
        : { rowCount: 0 };
      const memberCount = await client.query(
        `select count(*)::int as member_count
         from du_lieu.thanh_vien_trang_trai
         where trang_trai_id = $1`,
        [farmId]
      );
      if (existingMember.rowCount === 0 && Number(memberCount.rows[0]?.member_count ?? 0) >= 3) {
        throw new AddUserError("Trang trại đã đạt giới hạn 3 người dùng.", 409);
      }

      const fullName = buildFullName(firstName, lastName, email);
      let userId = existingUserId;
      if (userId) {
        await client.query(
          `update du_lieu.nguoi_dung
           set ho_ten = coalesce(nullif(ho_ten, ''), nullif($2, ''), ho_ten),
               so_dien_thoai = coalesce(nullif(so_dien_thoai, ''), $3),
               ngon_ngu = coalesce(nullif(ngon_ngu, ''), nullif($4, ''), ngon_ngu),
               updated_at = now()
           where id = $1`,
          [userId, fullName, normalizedPhone, language]
        );
      } else {
        const user = await client.query(
          `insert into du_lieu.nguoi_dung (ho_ten, email, mat_khau_hash, so_dien_thoai, ngon_ngu, trang_thai)
           values ($1, $2, $3, $4, $5, $6)
           returning id`,
          [fullName, email, makeTemporaryPasswordHash(), normalizedPhone, language, accountEnabled ? "active" : "disabled"]
        );
        userId = String(user.rows[0].id);
      }

      const role = await client.query(
        `select id
         from du_lieu.vai_tro_trang_trai
         where trang_trai_id = $1 and ma_vai_tro = $2
         limit 1`,
        [farmId, effectiveRole]
      );
      const roleId = role.rows[0]?.id ? String(role.rows[0].id) : null;
      if (!roleId) {
        throw new AddUserError("Vai trò được chọn chưa được cấu hình cho trang trại.", 400);
      }

      await client.query(
        `insert into du_lieu.thanh_vien_trang_trai
           (trang_trai_id, nguoi_dung_id, vai_tro_id, trang_thai, metadata_json)
         values ($1, $2, $3, $4, $5::jsonb)
         on conflict (trang_trai_id, nguoi_dung_id) do update
         set vai_tro_id = excluded.vai_tro_id,
             trang_thai = excluded.trang_thai,
             metadata_json = excluded.metadata_json,
             updated_at = now()`,
        [
          farmId,
          userId,
          roleId,
          accountEnabled ? "active" : "disabled",
          JSON.stringify({ base_role: baseRole, farm_role: farmRole, source: "settings" }),
        ]
      );

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    const profile = await loadSettingsProfile(ownerId);
    return NextResponse.json({ message: "Đã thêm người dùng và phân quyền.", profile });
  } catch (error) {
    const status = error instanceof AddUserError ? error.status : isPgUniqueViolation(error) ? 409 : 500;
    const message = isPgUniqueViolation(error)
      ? "Email hoặc số điện thoại đã tồn tại trong hệ thống. Vui lòng kiểm tra lại."
      : error instanceof Error
        ? error.message
        : "Không thể thêm người dùng.";

    return NextResponse.json(
      { message, error: String(error) },
      { status }
    );
  }
}
