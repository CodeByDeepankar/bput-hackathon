import { NextResponse } from "next/server";
import { supabase, run, nowIso, isSupabaseConfigured } from "../_utils/supabase";

export const runtime = "nodejs";

export async function GET() {
  let dbStatus = isSupabaseConfigured ? "connected" : "not_configured";
  let dbError = null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from("user_roles").select("user_id").limit(1);
      if (error) {
        dbStatus = "pending_schema_setup";
        dbError = error.message;
      }
    } catch (err) {
      dbStatus = "error";
      dbError = err.message;
    }
  }

  return NextResponse.json({
    status: "healthy",
    ok: true,
    database: dbStatus,
    dbError,
    timestamp: nowIso(),
    environment: process.env.NODE_ENV || "development",
  });
}
