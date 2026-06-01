import { db } from "@/lib/db";
import { ensureSettingsSchema } from "@/lib/settings-schema";

export type FarmAccessAction = "read" | "write" | "settings" | "users" | "documents" | "owner";

export type FarmAccess = {
  farmId: string;
  farmName: string | null;
  ownerId: string;
  roleCode: string;
  roleName: string;
  permissions: Record<string, unknown>;
  isOwner: boolean;
  canRead: boolean;
  canWrite: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
  canManageDocuments: boolean;
};

const OWNER_PERMISSIONS = {
  read: true,
  settings: true,
  users: true,
  documents: true,
  farm: true,
  write: true,
};

const ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  owner: OWNER_PERMISSIONS,
  admin: {
    read: true,
    settings: true,
    users: true,
    documents: true,
    farm: true,
    write: true,
  },
  editor: {
    read: true,
    settings: false,
    users: false,
    documents: true,
    farm: true,
    write: true,
  },
  viewer: {
    read: true,
    settings: false,
    users: false,
    documents: false,
    farm: true,
    write: false,
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasPermission = (permissions: Record<string, unknown>, key: string) => permissions[key] === true;

function normalizeFarmAccess(row: Record<string, unknown>, userId: string): FarmAccess {
  const ownerId = String(row.owner_id ?? "");
  const isOwner = ownerId === userId || row.is_owner === true;
  const dbPermissions = isRecord(row.permissions) ? row.permissions : {};
  const roleCode = isOwner ? "owner" : String(row.role_code ?? "viewer").toLowerCase();
  const permissions = { ...(ROLE_PERMISSIONS[roleCode] ?? ROLE_PERMISSIONS.viewer), ...dbPermissions };
  const roleName = isOwner ? "Chủ sở hữu" : String(row.role_name ?? "Chỉ xem");
  const canWrite =
    isOwner ||
    roleCode === "admin" ||
    roleCode === "editor" ||
    hasPermission(permissions, "write");
  const canManageSettings = isOwner || roleCode === "admin" || hasPermission(permissions, "settings");
  const canManageUsers = isOwner || roleCode === "admin" || hasPermission(permissions, "users");
  const canManageDocuments =
    isOwner ||
    roleCode === "admin" ||
    roleCode === "editor" ||
    hasPermission(permissions, "documents");

  return {
    farmId: String(row.farm_id),
    farmName: row.farm_name ? String(row.farm_name) : null,
    ownerId,
    roleCode,
    roleName,
    permissions,
    isOwner,
    canRead: true,
    canWrite,
    canManageSettings,
    canManageUsers,
    canManageDocuments,
  };
}

export function canAccessFarm(access: FarmAccess | null, action: FarmAccessAction) {
  if (!access) return false;
  if (action === "read") return access.canRead;
  if (action === "write") return access.canWrite;
  if (action === "settings") return access.canManageSettings;
  if (action === "users") return access.canManageUsers;
  if (action === "documents") return access.canManageDocuments;
  if (action === "owner") return access.isOwner;
  return false;
}

export async function getAccessibleFarm(userId: string, farmId?: string | null): Promise<FarmAccess | null> {
  await ensureSettingsSchema();

  const targetFarmId = typeof farmId === "string" && farmId.trim() ? farmId.trim() : null;
  const result = await db.query(
    `select
       t.id::text as farm_id,
       t.ten_trang_trai as farm_name,
       t.chu_so_huu_id::text as owner_id,
       (t.chu_so_huu_id::text = $1) as is_owner,
       vt.ma_vai_tro as role_code,
       vt.ten_vai_tro as role_name,
       vt.quyen as permissions,
       tv.ngay_tham_gia
     from du_lieu.trang_trai t
     left join du_lieu.thanh_vien_trang_trai tv
       on tv.trang_trai_id = t.id
      and tv.nguoi_dung_id::text = $1
      and lower(coalesce(tv.trang_thai, 'active')) = 'active'
     left join du_lieu.vai_tro_trang_trai vt on vt.id = tv.vai_tro_id
     where ($2::text is null or t.id::text = $2::text)
       and (t.chu_so_huu_id::text = $1 or tv.nguoi_dung_id::text = $1)
     order by
       case
         when tv.metadata_json->>'source' = 'invite' then 0
         when t.chu_so_huu_id::text = $1 then 1
         else 2
       end,
       coalesce(tv.updated_at, tv.ngay_tham_gia, t.updated_at, t.created_at) desc nulls last,
       t.created_at desc nulls last,
       t.id desc
     limit 1`,
    [userId, targetFarmId]
  );

  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row?.farm_id ? normalizeFarmAccess(row, userId) : null;
}

export async function getAccessibleFarmCount(userId: string): Promise<number> {
  await ensureSettingsSchema();

  const result = await db.query(
    `select count(distinct t.id)::int as farm_count
     from du_lieu.trang_trai t
     left join du_lieu.thanh_vien_trang_trai tv
       on tv.trang_trai_id = t.id
      and tv.nguoi_dung_id::text = $1
      and lower(coalesce(tv.trang_thai, 'active')) = 'active'
     where t.chu_so_huu_id::text = $1 or tv.nguoi_dung_id::text = $1`,
    [userId]
  );

  return Number(result.rows[0]?.farm_count ?? 0);
}

export async function requireFarmAccess(userId: string, action: FarmAccessAction, farmId?: string | null) {
  const access = await getAccessibleFarm(userId, farmId);
  return canAccessFarm(access, action) ? access : null;
}

export async function getAccessibleFarmId(userId: string, action: FarmAccessAction = "read", farmId?: string | null) {
  const access = await requireFarmAccess(userId, action, farmId);
  return access?.farmId ?? null;
}
