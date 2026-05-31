import { db } from "@/lib/db";

export type PublicFarmMapItem = {
  farmId: string;
  farmName: string;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
  createdAt: string | null;
  locationName: string | null;
  latitude: number;
  longitude: number;
  isMapShared: boolean;
};

const DEFAULT_COORD = { latitude: 10.762622, longitude: 106.660172 };

export async function getPublicFarmMapItems(): Promise<PublicFarmMapItem[]> {
  const rs = await db.query(
    `select t.id as farm_id,
            t.ten_trang_trai as farm_name,
            t.created_at,
            coalesce(u.ho_ten, 'Nông dân') as owner_name,
            u.anh_dai_dien_url as owner_avatar_url,
            v.ten_dia_diem as location_name,
            coalesce(v.vi_do, t.vi_do, 10.762622) as latitude,
            coalesce(v.kinh_do, t.kinh_do, 106.660172) as longitude,
            coalesce(t.is_map_shared, false) as is_map_shared
     from du_lieu.trang_trai t
     left join du_lieu.nguoi_dung u on u.id = t.chu_so_huu_id
     left join du_lieu.vi_tri_trang_trai v on v.trang_trai_id = t.id
     where coalesce(t.is_map_shared, false) = true
       and (t.vi_do is not null
        or t.kinh_do is not null
        or v.vi_do is not null
        or v.kinh_do is not null)
     order by t.created_at desc nulls last, t.id desc`
  );

  return rs.rows
    .map((row) => ({
      farmId: String(row.farm_id),
      farmName: String(row.farm_name ?? "Trang trại"),
      ownerName: row.owner_name ? String(row.owner_name) : null,
      ownerAvatarUrl: row.owner_avatar_url ? String(row.owner_avatar_url) : null,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      locationName: row.location_name ? String(row.location_name) : null,
      latitude: Number.isFinite(Number(row.latitude)) ? Number(row.latitude) : DEFAULT_COORD.latitude,
      longitude: Number.isFinite(Number(row.longitude)) ? Number(row.longitude) : DEFAULT_COORD.longitude,
      isMapShared: Boolean(row.is_map_shared),
    }))
    .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
}
