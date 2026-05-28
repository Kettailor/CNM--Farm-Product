import { cookies as nextCookies } from "next/headers";
import { NextRequest } from "next/server";
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual, createHmac } from "crypto";

export const TEN_COOKIE_XAC_THUC = "phien_dang_nhap";
const THOI_GIAN_DANG_NHAP_GIAY = 60 * 60 * 24 * 14; // 14 ngày
const PBKDF2_VONG_LAP = 210000;
const PBKDF2_DO_DAI = 32;

function layBiMatXacThuc() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "ketkat-ecofarm-dev-secret";
  return secret;
}

export function taoMatKhauHash(matKhau: string) {
  const salt = randomBytes(16).toString("hex");
  const key = pbkdf2Sync(matKhau, salt, PBKDF2_VONG_LAP, PBKDF2_DO_DAI, "sha256").toString("hex");
  return `pbkdf2$${PBKDF2_VONG_LAP}$${salt}$${key}`;
}

export function kiemTraMatKhau(matKhauNhap: string, hashDaLuu: string) {
  if (hashDaLuu.startsWith("pbkdf2$")) {
    const [, vongLapRaw, salt, keyHex] = hashDaLuu.split("$");
    const vongLap = Number(vongLapRaw);
    if (!Number.isFinite(vongLap) || !salt || !keyHex) return false;
    const keyTinh = pbkdf2Sync(matKhauNhap, salt, vongLap, PBKDF2_DO_DAI, "sha256");
    const keyDaLuu = Buffer.from(keyHex, "hex");
    return keyDaLuu.length === keyTinh.length && timingSafeEqual(keyDaLuu, keyTinh);
  }

  const legacyMd5 = createHash("md5").update(matKhauNhap).digest("hex");
  return legacyMd5 === hashDaLuu;
}

export function hashDangLegacyMd5(hashDaLuu: string) {
  return !hashDaLuu.startsWith("pbkdf2$");
}

export function taoTokenXacThuc(ownerId: string) {
  const payload = { owner_id: ownerId, exp: Math.floor(Date.now() / 1000) + THOI_GIAN_DANG_NHAP_GIAY };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", layBiMatXacThuc()).update(payloadBase64).digest("base64url");
  return `${payloadBase64}.${signature}`;
}

export function giaiMaTokenXacThuc(token?: string | null): string | null {
  if (!token || !token.includes(".")) return null;
  const [payloadBase64, signature] = token.split(".");
  const signatureHopLe = createHmac("sha256", layBiMatXacThuc()).update(payloadBase64).digest("base64url");
  if (signature !== signatureHopLe) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf8")) as { owner_id?: string; exp?: number };
    if (!payload?.owner_id || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.owner_id;
  } catch {
    return null;
  }
}

export function layOwnerIdTuRequest(request: NextRequest): string | null {
  const token = request.cookies.get(TEN_COOKIE_XAC_THUC)?.value;
  return giaiMaTokenXacThuc(token);
}

export function layOwnerIdTuServerCookie(): string | null {
  const token = nextCookies().get(TEN_COOKIE_XAC_THUC)?.value;
  return giaiMaTokenXacThuc(token);
}

export const cauHinhCookieXacThuc = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: THOI_GIAN_DANG_NHAP_GIAY,
};

