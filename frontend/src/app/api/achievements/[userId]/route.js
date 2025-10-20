import { NextResponse } from "next/server";
import { supabase, run } from "../../_utils/supabase";

export const runtime = "nodejs";

export async function GET(_request, context) {
  try {
    const { userId } = await context.params;
    const rows = await run(
      supabase
        .from("achievements")
        .select("id, key, title, description, icon, awarded_at, meta")
        .eq("user_id", userId)
    );

    return NextResponse.json({
      userId,
      achievements: rows.map((row) => ({
        id: row.id,
        key: row.key,
        title: row.title,
        description: row.description,
        icon: row.icon,
        awardedAt: row.awarded_at,
        meta: row.meta || {},
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
