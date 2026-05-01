export type DuLieuTruyXuatTam = {
  ma_truy_xuat: string;
  ma_san_pham: string;
  loai_san_pham: string;
  nguon_goc: string;
  ma_bam_du_lieu: string;
  trang_thai_dong_bo: "cho_dong_bo" | "da_dong_bo" | "that_bai";
};

export const TRANG_THAI_CHUOI_KHOI = {
  KHOI_TAO: "khoi_tao",
  CHO_DONG_BO: "cho_dong_bo",
  DA_DONG_BO: "da_dong_bo",
  THAT_BAI: "that_bai",
} as const;

export function taoMaTruyXuat(prefix = "TX") {
  const t = Date.now();
  const r = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `${prefix}-${t}-${r}`;
}

