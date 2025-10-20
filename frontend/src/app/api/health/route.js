import { NextResponse } from "next/server";
import { supabase, run, nowIso } from "../_utils/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    await run(supabase.from("user_roles").select("user_id").limit(1));
    return NextResponse.json({
      status: "healthy",
      database: "connected",
      timestamp: nowIso(),
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "disconnected",
        error: error.message,
        timestamp: nowIso(),
      },
      { status: 503 }
    );
  }
}
