export const TEN_COOKIE_XAC_THUC = "phien_dang_nhap";
export const THOI_GIAN_DANG_NHAP_GIAY = 60 * 60 * 24 * 14;

export type TokenXacThucPayload = {
  owner_id?: string;
  exp?: number;
};

export function layBiMatXacThuc() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "ketkat-ecofarm-dev-secret";
}

function giaiMaBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function docPayloadTokenXacThuc(payloadBase64: string): TokenXacThucPayload | null {
  try {
    return JSON.parse(giaiMaBase64Url(payloadBase64)) as TokenXacThucPayload;
  } catch {
    return null;
  }
}

export function payloadTokenConHan(payload: TokenXacThucPayload | null) {
  if (!payload?.owner_id || !payload?.exp) return false;
  return payload.exp >= Math.floor(Date.now() / 1000);
}
