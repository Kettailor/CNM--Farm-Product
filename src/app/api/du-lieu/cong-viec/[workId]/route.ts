import { NextRequest, NextResponse } from "next/server";
import { layOwnerIdTuRequest, layOwnerIdTuServerCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessibleFarmId } from "@/lib/farm-access";
import { ensureWorkSchema } from "@/lib/cong-viec-schema";
import { loadWorkTasks } from "@/lib/cong-viec-data";

export const dynamic = "force-dynamic";

type WorkUpdatePayload = {
  title?: unknown;
  description?: unknown;
};

function cleanString(value: unknown, max = 240) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, max);
}

async function getOwnerFarmId(ownerId: string) {
  return getAccessibleFarmId(ownerId, "write");
}

async function assertOwnedWork(workId: string, farmId: string) {
  const workRs = await db.query<{ id: string }>(
    `select id::text
     from du_lieu.cong_viec
     where id::text = $1 and trang_trai_id = $2
     limit 1`,
    [workId, farmId]
  );
  return Boolean(workRs.rows[0]);
}

export async function PATCH(request: NextRequest, { params }: { params: { workId: string } }) {
  try {
    const ownerId = layOwnerIdTuRequest(request) || layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });

    await ensureWorkSchema();
    const farmId = await getOwnerFarmId(ownerId);
    if (!farmId) return NextResponse.json({ message: "Không có quyền sửa công việc." }, { status: 403 });

    const workId = cleanString(params.workId, 80);
    if (!workId) return NextResponse.json({ message: "Công việc không hợp lệ." }, { status: 400 });
    if (!(await assertOwnedWork(workId, farmId))) return NextResponse.json({ message: "Không tìm thấy công việc." }, { status: 404 });

    const body = (await request.json()) as WorkUpdatePayload;
    const title = cleanString(body.title, 180);
    const description = cleanString(body.description, 1200);
    if (!title) return NextResponse.json({ message: "Vui lòng nhập tên công việc." }, { status: 400 });

    await db.query(
      `update du_lieu.cong_viec
       set ten_cong_viec = $1,
           mo_ta = $2,
           updated_at = now()
       where id::text = $3 and trang_trai_id = $4`,
      [title, description, workId, farmId]
    );

    const task = (await loadWorkTasks(farmId)).find((item) => item.id === workId);
    return NextResponse.json({ message: "Đã cập nhật công việc.", task });
  } catch (error) {
    return NextResponse.json({ message: "Không thể cập nhật công việc.", error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { workId: string } }) {
  try {
    const ownerId = layOwnerIdTuRequest(request) || layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });

    await ensureWorkSchema();
    const farmId = await getOwnerFarmId(ownerId);
    if (!farmId) return NextResponse.json({ message: "Không có quyền xóa công việc." }, { status: 403 });

    const workId = cleanString(params.workId, 80);
    if (!workId) return NextResponse.json({ message: "Công việc không hợp lệ." }, { status: 400 });

    const deleted = await db.query<{ id: string }>(
      `delete from du_lieu.cong_viec
       where id::text = $1 and trang_trai_id = $2
       returning id::text`,
      [workId, farmId]
    );
    if (!deleted.rows[0]) return NextResponse.json({ message: "Không tìm thấy công việc." }, { status: 404 });

    return NextResponse.json({ message: "Đã xóa công việc." });
  } catch (error) {
    return NextResponse.json({ message: "Không thể xóa công việc.", error: String(error) }, { status: 500 });
  }
}
