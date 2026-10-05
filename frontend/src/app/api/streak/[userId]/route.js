import { NextResponse } from "next/server";
import { calculateStreak } from "../../_utils/quiz";
import { nowIso } from "../../_utils/supabase";

export const runtime = "nodejs";

export async function GET(_request, context) {
  try {
    const { userId } = await context.params;
    const streak = await calculateStreak(userId);
    return NextResponse.json(
      { userId, currentStreak: streak, lastCalculated: nowIso() },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      {
        status: error.statusCode || 500,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" },
      }
    );
  }
}

