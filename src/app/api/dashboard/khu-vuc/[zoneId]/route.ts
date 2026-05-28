import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { layOwnerIdTuServerCookie } from "@/lib/auth";

type ZoneUpdatePayload = {
  name?: string;
  status?: string;
  description?: string;
  color?: string;
  points?: Array<{ lat: number; lng: number }>;
  areaHa?: number | string;
  perimeterM?: number | string;
  capacity?: string;
  typeSpecific?: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

type ZoneSnapshot = {
  id: string;
  ten_khu_vuc: string | null;
  trang_thai: string | null;
  mo_ta: string | null;
  mau_sac: string | null;
  dien_tich_ha: number | string | null;
  chu_vi_m: number | string | null;
  hinh_hoc_geojson: {
    geo?: { polygon?: Array<{ lat: number; lng: number }> } | null;
    metadata?: Record<string, unknown> | null;
  } | null;
};

const normalizePolygon = (points: unknown) => {
  const list = Array.isArray(points) ? points : [];
  return list
    .filter((p): p is { lat: number; lng: number } => Number.isFinite(Number((p as { lat?: unknown }).lat)) && Number.isFinite(Number((p as { lng?: unknown }).lng)))
    .map((p) => ({ lat: Number((p as { lat: number | string }).lat), lng: Number((p as { lng: number | string }).lng) }));
};

const snapshotJson = (zone: ZoneSnapshot | null) => {
  if (!zone) return null;
  const polygon = normalizePolygon(zone.hinh_hoc_geojson?.geo?.polygon ?? []);
  return {
    id: zone.id,
    name: zone.ten_khu_vuc ?? "",
    status: zone.trang_thai ?? "",
    description: zone.mo_ta ?? "",
    color: zone.mau_sac ?? "",
    areaHa: zone.dien_tich_ha ?? "",
    perimeterM: zone.chu_vi_m ?? "",
    polygon,
    metadata: zone.hinh_hoc_geojson?.metadata ?? {},
  };
};

async function loadCurrentZone(zoneId: string, ownerId: string) {
  const rs = await db.query(
    `select
      k.id::text as id,
      k.ten_khu_vuc,
      k.trang_thai,
      k.mo_ta,
      k.mau_sac,
      k.dien_tich_ha,
      k.chu_vi_m,
      k.hinh_hoc_geojson
     from du_lieu.khu_vuc k
     join du_lieu.trang_trai t on t.id = k.trang_trai_id
     where t.chu_so_huu_id::text = $1 and (k.id::text = $2 or k.ma_khu_vuc::text = $2)
     limit 1`,
    [ownerId, zoneId]
  );
  return (rs.rows[0] as ZoneSnapshot | undefined) ?? null;
}

export async function PUT(request: Request, { params }: { params: { zoneId: string } }) {
  try {
    const ownerId = layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Bạn chưa đăng nhập." }, { status: 401 });

    const body = (await request.json()) as ZoneUpdatePayload;
    const zoneId = params.zoneId;
    const current = await loadCurrentZone(zoneId, ownerId);
    if (!current) return NextResponse.json({ message: "Không tìm thấy khu vực hoặc không có quyền chỉnh sửa." }, { status: 404 });

    const polygon = normalizePolygon(body.points);
    const before = snapshotJson(current) ?? {};
    const typeSpecific = body.typeSpecific ?? {};
    const after = {
      ...before,
      name: body.name ?? current.ten_khu_vuc ?? "",
      status: body.status ?? current.trang_thai ?? "",
      description: body.description ?? current.mo_ta ?? "",
      color: body.color ?? current.mau_sac ?? "",
      areaHa: body.areaHa ?? current.dien_tich_ha ?? "",
      perimeterM: body.perimeterM ?? current.chu_vi_m ?? "",
      capacity: body.capacity ?? (before as Record<string, unknown>).capacity ?? "",
      typeSpecific,
      polygon: polygon.length > 0 ? polygon : normalizePolygon(current.hinh_hoc_geojson?.geo?.polygon ?? []),
    };

    const updateResult = await db.query(
      `update du_lieu.khu_vuc k
         set ten_khu_vuc = coalesce(nullif($1, ''), ten_khu_vuc),
             trang_thai = coalesce(nullif($2, ''), trang_thai),
             mo_ta = coalesce(nullif($3, ''), mo_ta),
             mau_sac = coalesce(nullif($4, ''), mau_sac),
             hinh_hoc_geojson = case
               when jsonb_array_length($5::jsonb) >= 3 then
                 jsonb_build_object(
                   'geo', jsonb_build_object('polygon', $5::jsonb),
                   'metadata', coalesce(k.hinh_hoc_geojson->'metadata', '{}'::jsonb) || jsonb_build_object('updated_from', 'dashboard-edit')
                 )
               else k.hinh_hoc_geojson
             end,
             dien_tich_ha = coalesce(nullif($6, '')::numeric, dien_tich_ha),
             chu_vi_m = coalesce(nullif($7, '')::numeric, chu_vi_m),
             updated_at = now()
        from du_lieu.trang_trai t
       where k.trang_trai_id = t.id
         and t.chu_so_huu_id::text = $8
         and (k.id::text = $9 or k.ma_khu_vuc::text = $9)
       returning k.id::text as id`,
      [body.name ?? "", body.status ?? "", body.description ?? "", body.color ?? "", JSON.stringify(polygon), body.areaHa ?? "", body.perimeterM ?? "", ownerId, zoneId, JSON.stringify(typeSpecific)]
    );

    if (!updateResult.rows[0]) {
      return NextResponse.json({ message: "Không thể cập nhật khu vực." }, { status: 500 });
    }

    const updated = await loadCurrentZone(zoneId, ownerId);
    const logPayload = {
      before,
      after: snapshotJson(updated) ?? after,
      changedFields: Object.keys(after).filter((key) => JSON.stringify((before as Record<string, unknown>)[key]) !== JSON.stringify((after as Record<string, unknown>)[key])),
    };

    await db.query(
      `insert into du_lieu.nhat_ky_chinh_sua_khu_vuc (khu_vuc_id, nguoi_dung_id, hanh_dong, du_lieu_cu, du_lieu_moi, ghi_luc_vao)
       values ($1, $2, $3, $4::jsonb, $5::jsonb, now())`,
      [updateResult.rows[0].id, ownerId, "Cập nhật khu vực", JSON.stringify(before), JSON.stringify(logPayload)]
    );

    return NextResponse.json({ ok: true, id: updateResult.rows[0].id, log: logPayload });
  } catch (error) {
    return NextResponse.json({ message: "Không thể cập nhật khu vực.", error: String(error) }, { status: 500 });
  }
}
