import { NextResponse } from "next/server";
import { supabase, run } from "../_utils/supabase";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url || "");
    const schoolId = searchParams.get("schoolId");
    const klass = searchParams.get("class");

    const rows = await run(supabase.from("quiz_responses").select("student_id, score"));

    // Fetch user roles for student names and filtering
    const rolesMap = new Map();
    try {
      const userRoles = await run(supabase.from("user_roles").select("user_id, name, class, school_id"));
      for (const r of userRoles || []) {
        rolesMap.set(r.user_id, r);
      }
    } catch (e) {
      console.warn("[/api/leaderboard] Failed to fetch user_roles:", e.message);
    }

    const stats = new Map();
    for (const row of rows || []) {
      const role = rolesMap.get(row.student_id);
      
      // Filter by school or class if requested
      if (schoolId && role?.school_id && role.school_id !== schoolId) continue;
      if (klass && role?.class) {
        const studentKlassNum = String(role.class).replace(/\D/g, "");
        const targetKlassNum = String(klass).replace(/\D/g, "");
        if (studentKlassNum && targetKlassNum && studentKlassNum !== targetKlassNum) continue;
      }

      const stat = stats.get(row.student_id) || {
        studentId: row.student_id,
        name: role?.name || `Student ${row.student_id.slice(0, 6)}`,
        class: role?.class || null,
        schoolId: role?.school_id || null,
        totalQuizzes: 0,
        totalScore: 0,
        bestScore: 0,
      };
      stat.totalQuizzes += 1;
      stat.totalScore += Number(row.score) || 0;
      stat.bestScore = Math.max(stat.bestScore, Number(row.score) || 0);
      stats.set(row.student_id, stat);
    }

    const leaderboard = Array.from(stats.values())
      .map((stat) => ({
        ...stat,
        averageScore: stat.totalQuizzes ? Math.round(stat.totalScore / stat.totalQuizzes) : 0,
        xp: Math.round(stat.totalScore * 10), // Calculate XP dynamically from total score
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 100);

    return NextResponse.json(leaderboard, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    });
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

