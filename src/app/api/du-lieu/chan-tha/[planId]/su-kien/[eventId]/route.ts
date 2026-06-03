import { NextRequest, NextResponse } from "next/server";
import { layOwnerIdTuRequest, layOwnerIdTuServerCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessibleFarmId } from "@/lib/farm-access";
import { ensureGrazingSchema } from "@/lib/grazing-schema";
import { loadGrazingPlanById } from "@/lib/grazing-data";

export const dynamic = "force-dynamic";

function boolValue(value: unknown) {
  return value === true || value === "true" || value === "1" || value === 1;
}

function dateOrNull(value: unknown) {
  const match = String(value ?? "").match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function occurrenceCompleted(metadata: unknown, occurrenceDate: string | null) {
  if (!occurrenceDate || !metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const occurrences = (metadata as { completedOccurrences?: unknown }).completedOccurrences;
  if (!occurrences || typeof occurrences !== "object" || Array.isArray(occurrences)) return false;
  const occurrence = (occurrences as Record<string, { completed?: unknown }>)[occurrenceDate];
  return occurrence?.completed === true || occurrence?.completed === "true";
}

export async function PATCH(request: NextRequest, { params }: { params: { planId: string; eventId: string } }) {
  try {
    const ownerId = layOwnerIdTuRequest(request) || layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });

    await ensureGrazingSchema();
    const farmId = await getAccessibleFarmId(ownerId, "write");
    if (!farmId) return NextResponse.json({ message: "Không có quyền cập nhật kế hoạch chăn thả." }, { status: 403 });

    const body = (await request.json().catch(() => ({}))) as { completed?: unknown; occurrenceDate?: unknown };
    const completed = boolValue(body.completed);
    const occurrenceDate = dateOrNull(body.occurrenceDate);
    const status = completed ? "completed" : "active";

    if (completed) {
      const dependencyRs = await db.query<{
        plan_type: string | null;
        prerequisite_id: string | null;
        prerequisite_status: string | null;
        prerequisite_metadata: Record<string, unknown> | null;
      }>(
        `select p.kieu_ke_hoach as plan_type,
                e.metadata_json->>'prerequisiteId' as prerequisite_id,
                prerequisite.trang_thai as prerequisite_status,
                prerequisite.metadata_json as prerequisite_metadata
         from du_lieu.su_kien_chan_tha e
         join du_lieu.ke_hoach_chan_tha p on p.id = e.ke_hoach_id
         left join du_lieu.su_kien_chan_tha prerequisite
           on prerequisite.ke_hoach_id = e.ke_hoach_id
         and (
            prerequisite.id::text = e.metadata_json->>'prerequisiteId'
            or prerequisite.metadata_json->>'sourceId' = e.metadata_json->>'prerequisiteId'
          )
          and (
            prerequisite.ngay_bat_dau is null
            or e.ngay_bat_dau is null
            or prerequisite.ngay_bat_dau <= e.ngay_bat_dau
          )
         where p.trang_trai_id = $1
           and p.id::text = $2
           and e.id::text = $3
         order by prerequisite.ngay_bat_dau desc nulls last
         limit 1`,
        [farmId, params.planId, params.eventId]
      );
      const dependency = dependencyRs.rows[0];
      if (dependency?.prerequisite_id) {
        const prerequisiteDone = dependency.plan_type === "perpetual"
          ? occurrenceCompleted(dependency.prerequisite_metadata, occurrenceDate)
          : dependency.prerequisite_status === "completed";
        if (!prerequisiteDone) {
          return NextResponse.json({ message: "Công việc này có quan hệ F-S. Hãy hoàn thành công việc trước trước khi đánh dấu xong." }, { status: 409 });
        }
      }
    }

    const result = await db.query(
      `update du_lieu.su_kien_chan_tha e
          set trang_thai = case
                when lower(coalesce(p.kieu_ke_hoach, '')) = 'perpetual'
                 and lower(coalesce(e.metadata_json->>'repeat', '')) in ('true', '1')
                then e.trang_thai
                else $1
              end,
              metadata_json = case
                when lower(coalesce(p.kieu_ke_hoach, '')) = 'perpetual'
                 and lower(coalesce(e.metadata_json->>'repeat', '')) in ('true', '1')
                 and $6::text is not null
                then jsonb_set(
                  coalesce(e.metadata_json, '{}'::jsonb),
                  array['completedOccurrences', $6::text],
                  jsonb_build_object(
                    'completed', $2::boolean,
                    'completedAt', case when $2::boolean then to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') else null end
                  ),
                  true
                )
                else coalesce(e.metadata_json, '{}'::jsonb) ||
                  jsonb_build_object(
                    'completed', $2::boolean,
                    'completedAt', case when $2::boolean then to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') else null end
                  )
              end,
              updated_at = now()
       from du_lieu.ke_hoach_chan_tha p
       where e.ke_hoach_id = p.id
         and p.trang_trai_id = $3
         and p.id::text = $4
         and e.id::text = $5
       returning e.id::text`,
      [status, completed, farmId, params.planId, params.eventId, occurrenceDate]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ message: "Không tìm thấy nhiệm vụ hoặc không có quyền cập nhật." }, { status: 404 });
    }

    const plan = await loadGrazingPlanById(farmId, params.planId);
    return NextResponse.json({ message: completed ? "Đã đánh dấu nhiệm vụ hoàn tất." : "Đã mở lại nhiệm vụ.", plan });
  } catch (error) {
    return NextResponse.json({ message: "Không thể cập nhật nhiệm vụ.", error: String(error) }, { status: 500 });
  }
}
