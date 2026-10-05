import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase, run, runSingle } from "../../_utils/supabase";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const authObj = await auth();
    const userId = authObj?.userId || searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        {
          status: 400,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" },
        }
      );
    }

    // 1. Fetch Student Profile from user_roles database using Clerk user ID as absolute source of truth
    let roleDoc = null;
    try {
      roleDoc = await runSingle(
        supabase
          .from("user_roles")
          .select("user_id, role, name, class, school_id")
          .eq("user_id", userId)
          .maybeSingle()
      );
    } catch (e) {
      console.warn("[/api/student/dashboard] DB user_roles query failed:", e.message);
    }

    const studentName = roleDoc?.name || "Student";
    const studentClass = roleDoc?.class || null;
    const schoolId = roleDoc?.school_id || null;


    // 2. Fetch Subjects strictly for Student's Class & School
    let subjects = [];
    try {
      const allSubjects = await run(
        supabase
          .from("subjects")
          .select("id, name, class, description, created_by, school_id, icon, color, created_at")
          .order("created_at", { ascending: false })
      );

      const cleanClassFilter = studentClass ? String(studentClass).trim().toLowerCase() : "";
      const numericClass = studentClass ? String(studentClass).replace(/\D/g, "") : "";

      subjects = (allSubjects || []).filter((s) => {
        // School ID isolation check
        if (schoolId && s.school_id && s.school_id !== schoolId) return false;

        // Class matching check
        if (!s.class || s.class === "all" || s.class === "5-8" || s.class === "1-12") return true;
        if (!cleanClassFilter) return true;
        const subClass = String(s.class).trim().toLowerCase();
        if (subClass === cleanClassFilter) return true;
        if (numericClass && subClass.replace(/\D/g, "") === numericClass) return true;
        return false;
      });
    } catch (e) {
      console.warn("[/api/student/dashboard] DB subjects query failed:", e.message);
    }

    // 3. Fetch Streaks strictly for this Student
    let streak = { current_streak: 0, last_completion_date: null };
    try {
      const streakDoc = await runSingle(
        supabase
          .from("streaks")
          .select("current_streak, last_completion_date")
          .eq("user_id", userId)
          .maybeSingle()
      );
      if (streakDoc) streak = streakDoc;
    } catch (e) {
      console.warn("[/api/student/dashboard] DB streak query failed:", e.message);
    }

    // 4. Fetch Achievements strictly for this Student
    let achievements = [];
    try {
      achievements = (await run(
        supabase
          .from("achievements")
          .select("id, key, title, description, icon, awarded_at")
          .eq("user_id", userId)
          .order("awarded_at", { ascending: false })
      )) || [];
    } catch (e) {
      console.warn("[/api/student/dashboard] DB achievements query failed:", e.message);
    }

    // 5. Fetch Recent Quiz Completions / History strictly for this Student
    let recentQuizzes = [];
    try {
      recentQuizzes = (await run(
        supabase
          .from("quiz_completions")
          .select("id, quiz_id, score, time_spent, subject, completed_at")
          .eq("user_id", userId)
          .order("completed_at", { ascending: false })
          .limit(10)
      )) || [];
    } catch (e) {
      console.warn("[/api/student/dashboard] DB quiz_completions query failed:", e.message);
    }

    // 6. Fetch Teacher Shared Content strictly for this Student's School
    let schoolContent = [];
    if (schoolId) {
      try {
        schoolContent = (await run(
          supabase
            .from("school_content")
            .select("id, school_id, created_by, type, title, description, url, embed_html, body, tags, created_at")
            .eq("school_id", schoolId)
            .order("created_at", { ascending: false })
            .limit(20)
        )) || [];
      } catch (e) {
        console.warn("[/api/student/dashboard] DB school_content query failed:", e.message);
      }
    }

    return NextResponse.json(
      {
        student: {
          userId,
          name: studentName,
          class: studentClass,
          schoolId,
          role: roleDoc?.role || "student",
        },
        subjects,
        streak,
        achievements,
        recentQuizzes,
        schoolContent,
      },
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
        status: 500,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" },
      }
    );
  }
}
