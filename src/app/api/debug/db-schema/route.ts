import { NextResponse } from "next/server";
import { auditDbSchema } from "@/lib/db-schema-audit";

export async function GET() {
  try {
    const data = await auditDbSchema();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Không thể audit schema DB.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
