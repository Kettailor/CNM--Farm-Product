import { db } from "@/lib/db";

export type SchemaColumn = {
  table_schema: string;
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  ordinal_position: number;
};

export type SchemaTable = {
  table_schema: string;
  table_name: string;
  table_type: string;
};

export type SchemaAuditResult = {
  schemas: string[];
  tables: SchemaTable[];
  columns: SchemaColumn[];
  missing: {
    zoneTables: string[];
    zoneColumns: Record<string, string[]>;
  };
};

const EXPECTED_ZONE_TABLES = [
  "du_lieu.nong_trai",
  "du_lieu.dong_chan_tha",
  "du_lieu.vi_tri_nong_trai",
  "du_lieu.ghi_chu_khu_vuc",
  "du_lieu.lich_su_khu_vuc",
];

const EXPECTED_ZONE_COLUMNS: Record<string, string[]> = {
  "du_lieu.dong_chan_tha": [
    "id",
    "farm_id",
    "name",
    "crop_type",
    "status",
    "area_ha",
    "created_at",
    "updated_at",
    "boundary_geojson",
  ],
  "du_lieu.nong_trai": ["id", "name", "owner_id", "created_at"],
  "du_lieu.vi_tri_nong_trai": ["farm_id", "latitude", "longitude", "location_name"],
  "du_lieu.ghi_chu_khu_vuc": ["id", "zone_id", "note_type", "content", "author", "created_at"],
  "du_lieu.lich_su_khu_vuc": ["id", "zone_id", "action", "details", "actor", "created_at"],
};

async function tableExists(fullTableName: string) {
  const rs = await db.query(`select to_regclass($1) is not null as exists`, [fullTableName]);
  return Boolean(rs.rows[0]?.exists);
}

export async function auditDbSchema(): Promise<SchemaAuditResult> {
  const schemasRs = await db.query(
    `select schema_name
     from information_schema.schemata
     order by schema_name`
  );

  const tablesRs = await db.query(
    `select table_schema, table_name, table_type
     from information_schema.tables
     order by table_schema, table_name`
  );

  const columnsRs = await db.query(
    `select table_schema, table_name, column_name, data_type, is_nullable, column_default, ordinal_position
     from information_schema.columns
     order by table_schema, table_name, ordinal_position`
  );

  const existingColumns = new Set(columnsRs.rows.map((row: { table_schema: string; table_name: string; column_name: string }) => `${row.table_schema}.${row.table_name}.${row.column_name}`));

  const zoneTables = await Promise.all(EXPECTED_ZONE_TABLES.map(async (table) => ({ table, exists: await tableExists(table) })));
  const missingTables = zoneTables.filter((item) => !item.exists).map((item) => item.table);

  const missingColumns: Record<string, string[]> = {};
  for (const [table, expectedCols] of Object.entries(EXPECTED_ZONE_COLUMNS)) {
    missingColumns[table] = expectedCols.filter((col) => !existingColumns.has(`${table}.${col}`));
  }

  return {
    schemas: schemasRs.rows.map((row: { schema_name: string }) => String(row.schema_name)),
    tables: tablesRs.rows.map((row: { table_schema: string; table_name: string; table_type: string }) => ({
      table_schema: String(row.table_schema),
      table_name: String(row.table_name),
      table_type: String(row.table_type),
    })),
    columns: columnsRs.rows.map((row: { table_schema: string; table_name: string; column_name: string; data_type: string; is_nullable: string; column_default: string | null; ordinal_position: number }) => ({
      table_schema: String(row.table_schema),
      table_name: String(row.table_name),
      column_name: String(row.column_name),
      data_type: String(row.data_type),
      is_nullable: String(row.is_nullable),
      column_default: row.column_default ? String(row.column_default) : null,
      ordinal_position: Number(row.ordinal_position),
    })),
    missing: {
      zoneTables: missingTables,
      zoneColumns: missingColumns,
    },
  };
}
