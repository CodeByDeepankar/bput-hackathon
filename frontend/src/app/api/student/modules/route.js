import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase, run, runSingle } from "../../_utils/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const authObj = await auth();
    const userId = authObj?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: Please sign in" }, { status: 401 });
    }

    // 1. Fetch Student Profile from user_roles
    let roleDoc = null;
    let roleErr = null;
    try {
      const { data: rData, error: rError } = await supabase
        .from("user_roles")
        .select("user_id, role, name, class, school_id")
        .eq("user_id", userId)
        .maybeSingle();
      roleDoc = rData;
      roleErr = rError;
    } catch (e) {
      console.warn("[/api/student/modules] user_roles query failed:", e.message);
      roleErr = e;
    }

    const studentClass = roleDoc?.class || null;
    const schoolId = roleDoc?.school_id || null;

    console.log("===== MODULE FETCH DEBUG =====");
    console.log("authenticatedUserId:", userId);
    console.log("studentRole:", roleDoc?.role || "NOT_FOUND");
    console.log("studentClass:", studentClass);
    console.log("studentSchoolId:", schoolId);
    console.log("user_roles error:", roleErr?.message || null);

    if (!schoolId || !studentClass) {
      console.log("===== RESULT: MISSING CLASS OR SCHOOL =====");
      return NextResponse.json({
        modules: [],
        studentClass,
        schoolId,
        message: "Student class and school must be set to view learning modules.",
      });
    }

    console.log("===== QUERY FILTER =====");
    console.log("class filter:", studentClass);
    console.log("school_id filter:", schoolId);

    // 2. Fetch published learning modules for student's school_id and class
    let modules = [];
    let modErr = null;
    try {
      const res = await supabase
        .from("learning_modules")
        .select(`
          id,
          school_id,
          class,
          subject_id,
          title,
          description,
          thumbnail_url,
          published,
          created_at,
          updated_at
        `)
        .eq("school_id", schoolId)
        .eq("class", studentClass)
        .order("created_at", { ascending: false });

      modErr = res.error;
      modules = res.data || [];
    } catch (e) {
      console.warn("[/api/student/modules] learning_modules query failed:", e.message);
      modErr = e;
    }

    console.log("===== DATABASE RESULT =====");
    console.log("error:", modErr?.message || null);
    console.log("number of modules:", modules.length);
    console.log("module IDs:", modules.map((m) => m.id));
    console.log("module titles:", modules.map((m) => m.title));

    if (modules.length === 0) {
      return NextResponse.json({
        modules: [],
        studentClass,
        schoolId,
      });
    }

    // 3. Fetch Subject Details for each module
    const subjectIds = Array.from(new Set(modules.map((m) => m.subject_id).filter(Boolean)));
    let subjectsMap = {};
    if (subjectIds.length > 0) {
      try {
        const { data: subData } = await supabase
          .from("subjects")
          .select("id, name, code, icon, color")
          .in("id", subjectIds);

        if (subData) {
          subData.forEach((s) => {
            subjectsMap[s.id] = s;
          });
        }
      } catch (e) {
        console.warn("[/api/student/modules] subjects query error:", e.message);
      }
    }

    // 4. Fetch Published Lessons for these modules
    const moduleIds = modules.map((m) => m.id);
    let lessonsMap = {};
    let allLessonIds = [];

    console.log(`[Student Modules Debug] Student class: ${studentClass} | School: ${schoolId}`);
    console.log(`[Student Modules Debug] Found ${modules.length} modules:`, modules.map((m) => ({ id: m.id, title: m.title })));

    try {
      let lessonData = null;
      let lErr = null;

      // Primary attempt: query with video_type column
      const res = await supabase
        .from("lessons")
        .select(`
          id,
          module_id,
          title,
          description,
          video_path,
          video_url,
          video_type,
          duration,
          order_index,
          is_required,
          published,
          created_at
        `)
        .in("module_id", moduleIds)
        .or("published.eq.true,published.is.null")
        .order("order_index", { ascending: true });

      lessonData = res.data;
      lErr = res.error;

      // Resilient Fallback: If video_type column is missing in DB, query without it
      if (lErr && (lErr.code === "42703" || lErr.message?.includes("video_type"))) {
        console.warn("[/api/student/modules] video_type column missing in DB, falling back to dynamic video_type detection.");
        const fallbackRes = await supabase
          .from("lessons")
          .select(`
            id,
            module_id,
            title,
            description,
            video_path,
            video_url,
            duration,
            order_index,
            is_required,
            published,
            created_at
          `)
          .in("module_id", moduleIds)
          .or("published.eq.true,published.is.null")
          .order("order_index", { ascending: true });

        if (fallbackRes.data) {
          lessonData = fallbackRes.data.map((l) => ({
            ...l,
            video_type: l.video_url && (l.video_url.includes("youtube") || l.video_url.includes("youtu.be")) ? "youtube" : "uploaded",
          }));
          lErr = null;
        } else {
          lErr = fallbackRes.error;
        }
      }

      if (lErr) {
        console.warn("[/api/student/modules] lessons query error:", lErr.message);
      } else if (lessonData) {
        console.log(`[Student Modules Debug] Found ${lessonData.length} lessons for moduleIds:`, lessonData.map((l) => ({ id: l.id, module_id: l.module_id, title: l.title, published: l.published })));
        lessonData.forEach((l) => {
          allLessonIds.push(l.id);
          if (!lessonsMap[l.module_id]) {
            lessonsMap[l.module_id] = [];
          }
          lessonsMap[l.module_id].push(l);
        });
      }
    } catch (e) {
      console.warn("[/api/student/modules] lessons query failed:", e.message);
    }

    // 5. Fetch Lesson Progress for authenticated student
    let progressMap = {};
    if (allLessonIds.length > 0) {
      try {
        const { data: progData, error: pErr } = await supabase
          .from("lesson_progress")
          .select("lesson_id, completed, last_position, completed_at, updated_at")
          .eq("student_id", userId)
          .in("lesson_id", allLessonIds);

        if (pErr) {
          console.warn("[/api/student/modules] lesson_progress query error:", pErr.message);
        } else if (progData) {
          progData.forEach((p) => {
            progressMap[p.lesson_id] = p;
          });
        }
      } catch (e) {
        console.warn("[/api/student/modules] lesson_progress query failed:", e.message);
      }
    }

    // 5.5 Fetch Quizzes linked to these modules
    let quizzesMap = {};
    try {
      const { data: quizData, error: qErr } = await supabase
        .from("quizzes")
        .select("id, module_id, title, description, difficulty, time_limit, is_published")
        .in("module_id", moduleIds);

      if (qErr) {
        console.warn("[/api/student/modules] quizzes query error:", qErr.message);
      } else if (quizData) {
        quizData.forEach((q) => {
          if (q.module_id) {
            quizzesMap[q.module_id] = q;
          }
        });
      }
    } catch (e) {
      console.warn("[/api/student/modules] quizzes query failed:", e.message);
    }

    // 6. Assemble complete response object
    const enrichedModules = modules.map((mod) => {
      const modLessons = (lessonsMap[mod.id] || []).map((l) => {
        const prog = progressMap[l.id] || null;
        return {
          ...l,
          progress: {
            completed: Boolean(prog?.completed),
            lastPosition: prog?.last_position || 0,
            completedAt: prog?.completed_at || null,
          },
        };
      });

      const totalLessons = modLessons.length;
      const completedLessons = modLessons.filter((l) => l.progress.completed).length;

      // Quiz unlock state calculation
      const moduleQuiz = quizzesMap[mod.id] || null;
      let quizObject = null;

      if (moduleQuiz) {
        const isModuleComplete = totalLessons > 0 && completedLessons === totalLessons;

        let state = "UNLOCKED";
        let unlocked = true;
        let message = null;

        if (totalLessons === 0) {
          state = "NO_LESSONS";
          unlocked = false;
          message = "No lessons published for this module yet.";
        } else if (!isModuleComplete) {
          state = "LESSONS_INCOMPLETE";
          unlocked = false;
          message = `Complete all ${totalLessons} lessons to unlock the quiz.`;
        } else if (!moduleQuiz.is_published) {
          state = "NOT_RELEASED";
          unlocked = false;
          message = "Your teacher has not released the quiz yet.";
        }

        quizObject = {
          id: moduleQuiz.id,
          title: moduleQuiz.title,
          description: moduleQuiz.description,
          difficulty: moduleQuiz.difficulty,
          timeLimit: moduleQuiz.time_limit,
          isPublished: Boolean(moduleQuiz.is_published),
          unlocked,
          state,
          message,
        };
      }

      return {
        ...mod,
        subject: subjectsMap[mod.subject_id] || { id: mod.subject_id, name: "General" },
        lessons: modLessons,
        quiz: quizObject,
        stats: {
          totalLessons,
          completedLessons,
          isCompleted: totalLessons > 0 && completedLessons === totalLessons,
        },
      };
    });

    return NextResponse.json({
      modules: enrichedModules,
      studentClass,
      schoolId,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    });
  } catch (error) {
    console.error("[/api/student/modules] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch student modules" },
      { status: error.statusCode || 500 }
    );
  }
}
