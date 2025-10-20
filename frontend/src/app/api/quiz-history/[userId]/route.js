import { NextResponse } from "next/server";
import { supabase, run } from "../../_utils/supabase";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    const { userId } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = supabase
      .from("quiz_completions")
      .select("id, quiz_id, score, time_spent, subject, completed_at")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(limit);

    if (startDate) query = query.gte("completed_at", startDate);
    if (endDate) query = query.lte("completed_at", `${endDate}T23:59:59Z`);

    const rows = await run(query);
    return NextResponse.json({ userId, completions: rows, total: rows.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
