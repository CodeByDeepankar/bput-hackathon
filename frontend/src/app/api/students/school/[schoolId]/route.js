import { NextResponse } from "next/server";
import { supabase, run } from "../../../_utils/supabase";

export const runtime = "nodejs";

export async function GET(_request, context) {
  try {
    const { schoolId } = await context.params;
    const rows = await run(
      supabase
        .from("user_roles")
        .select("user_id, name, class, school_id, created_at")
        .eq("school_id", schoolId)
        .eq("role", "student")
    );

    return NextResponse.json(
      rows.map((row) => ({
        id: row.user_id,
        userId: row.user_id,
        name: row.name,
        class: row.class,
        schoolId: row.school_id,
        createdAt: row.created_at,
      }))
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
