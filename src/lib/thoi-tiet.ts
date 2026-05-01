import { db } from "@/lib/db";

type DuLieuThoiTiet = {
  vi_do: number;
  kinh_do: number;
  nguon_du_lieu: string;
  cap_nhat_luc: string;
  het_han_luc: string;
  hien_tai: {
    nhiet_do_c: number | null;
    do_am_pct: number | null;
    luong_mua_mm: number | null;
    gio_m_s: number | null;
    ma_thoi_tiet: number | null;
    thoi_gian: string | null;
  };
  du_bao_3_ngay: Array<{
    ngay: string;
    nhiet_do_cao_nhat_c: number | null;
    nhiet_do_thap_nhat_c: number | null;
    mua_mm: number | null;
    uv_cao_nhat: number | null;
  }>;
};

const THOI_GIAN_CACHE_PHUT = 30;

const lamTronToaDo = (v: number) => Number(v.toFixed(3));
const taoViTriMa = (viDo: number, kinhDo: number) => `${lamTronToaDo(viDo)}_${lamTronToaDo(kinhDo)}`;

async function taoBangNeuChuaCo() {
  await db.query(`
    create table if not exists du_lieu.thoi_tiet_bo_nho_dem (
      vi_tri_ma text primary key,
      vi_do numeric(9,3) not null,
      kinh_do numeric(9,3) not null,
      du_lieu_hien_tai jsonb not null,
      du_lieu_du_bao jsonb not null,
      nguon_du_lieu text not null,
      cap_nhat_luc timestamptz not null,
      het_han_luc timestamptz not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
}

async function goiNguonNgoai(viDo: number, kinhDo: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${viDo}&longitude=${kinhDo}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max&timezone=Asia%2FBangkok&forecast_days=3`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Nguon thoi tiet loi: ${res.status}`);
  const data = await res.json();

  const hienTai = {
    nhiet_do_c: data?.current?.temperature_2m ?? null,
    do_am_pct: data?.current?.relative_humidity_2m ?? null,
    luong_mua_mm: data?.current?.precipitation ?? null,
    gio_m_s: data?.current?.wind_speed_10m ?? null,
    ma_thoi_tiet: data?.current?.weather_code ?? null,
    thoi_gian: data?.current?.time ?? null,
  };

  const duBao = Array.from({ length: 3 }).map((_, i) => ({
    ngay: data?.daily?.time?.[i] ?? "",
    nhiet_do_cao_nhat_c: data?.daily?.temperature_2m_max?.[i] ?? null,
    nhiet_do_thap_nhat_c: data?.daily?.temperature_2m_min?.[i] ?? null,
    mua_mm: data?.daily?.precipitation_sum?.[i] ?? null,
    uv_cao_nhat: data?.daily?.uv_index_max?.[i] ?? null,
  }));

  return { hienTai, duBao, nguon: "open_meteo" };
}

export async function layDuLieuThoiTietToiUu(viDoRaw: number, kinhDoRaw: number, batBuocLamMoi = false): Promise<DuLieuThoiTiet> {
  await taoBangNeuChuaCo();

  const viDo = lamTronToaDo(viDoRaw);
  const kinhDo = lamTronToaDo(kinhDoRaw);
  const viTriMa = taoViTriMa(viDo, kinhDo);

  const rs = await db.query(
    `select * from du_lieu.thoi_tiet_bo_nho_dem where vi_tri_ma = $1 limit 1`,
    [viTriMa]
  );
  const row = rs.rows[0];

  if (!batBuocLamMoi && row && new Date(row.het_han_luc).getTime() > Date.now()) {
    return {
      vi_do: Number(row.vi_do),
      kinh_do: Number(row.kinh_do),
      nguon_du_lieu: row.nguon_du_lieu,
      cap_nhat_luc: new Date(row.cap_nhat_luc).toISOString(),
      het_han_luc: new Date(row.het_han_luc).toISOString(),
      hien_tai: row.du_lieu_hien_tai,
      du_bao_3_ngay: row.du_lieu_du_bao,
    };
  }

  const tuNguonNgoai = await goiNguonNgoai(viDo, kinhDo);
  const capNhat = new Date();
  const hetHan = new Date(capNhat.getTime() + THOI_GIAN_CACHE_PHUT * 60 * 1000);

  await db.query(
    `insert into du_lieu.thoi_tiet_bo_nho_dem(vi_tri_ma,vi_do,kinh_do,du_lieu_hien_tai,du_lieu_du_bao,nguon_du_lieu,cap_nhat_luc,het_han_luc,updated_at)
     values($1,$2,$3,$4,$5,$6,$7,$8,now())
     on conflict(vi_tri_ma) do update set
      vi_do=excluded.vi_do,
      kinh_do=excluded.kinh_do,
      du_lieu_hien_tai=excluded.du_lieu_hien_tai,
      du_lieu_du_bao=excluded.du_lieu_du_bao,
      nguon_du_lieu=excluded.nguon_du_lieu,
      cap_nhat_luc=excluded.cap_nhat_luc,
      het_han_luc=excluded.het_han_luc,
      updated_at=now()`,
    [viTriMa, viDo, kinhDo, tuNguonNgoai.hienTai, tuNguonNgoai.duBao, tuNguonNgoai.nguon, capNhat.toISOString(), hetHan.toISOString()]
  );

  return {
    vi_do: viDo,
    kinh_do: kinhDo,
    nguon_du_lieu: tuNguonNgoai.nguon,
    cap_nhat_luc: capNhat.toISOString(),
    het_han_luc: hetHan.toISOString(),
    hien_tai: tuNguonNgoai.hienTai,
    du_bao_3_ngay: tuNguonNgoai.duBao,
  };
}
