import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type FarmRow = {
  farm_id: string;
  farm_name: string | null;
  owner_name: string | null;
  created_at: string | Date | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  is_map_shared: boolean | null;
};

export async function GET() {
  try {
    const rs = await db.query(
      `select n.id as farm_id,
              n.ten_trang_trai as farm_name,
              coalesce(c.ho_ten, c.email, 'Nông dân') as owner_name,
              n.created_at,
              v.vi_do as latitude,
              v.kinh_do as longitude,
              v.ten_dia_diem as location_name,
              coalesce(n.is_map_shared, false) as is_map_shared
       from du_lieu.trang_trai n
       left join du_lieu.nguoi_dung c on c.id = n.chu_so_huu_id
       left join du_lieu.vi_tri_trang_trai v on v.trang_trai_id = n.id
       where coalesce(n.is_map_shared, false) = true
         and v.vi_do is not null
         and v.kinh_do is not null
       order by n.created_at desc nulls last`,
      []
    );

    const farms = rs.rows.map((row: FarmRow) => ({
      id: row.farm_id,
      name: String(row.farm_name ?? "Trang trại"),
      ownerName: String(row.owner_name ?? "Nông dân"),
      createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString("vi-VN") : null,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      locationName: row.location_name ? String(row.location_name) : null,
    }));

    return NextResponse.json({ farms });
  } catch (error) {
    return NextResponse.json({ message: "Không thể tải bản đồ công khai.", error: String(error) }, { status: 500 });
  }
}
