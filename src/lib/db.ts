import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __ketkatDbPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Không throw ở đây để tránh crash khi build tĩnh.
  // API route sẽ xử lý lỗi khi thực thi runtime.
  // eslint-disable-next-line no-console
  console.warn("[KetKat-EcoFarm] DATABASE_URL chưa được cấu hình.");
}

export const db =
  global.__ketkatDbPool ??
  new Pool({
    connectionString,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  global.__ketkatDbPool = db;
}

