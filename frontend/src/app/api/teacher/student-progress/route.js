import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase, run, runSingle } from "../../_utils/supabase";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const authObj = await auth();
    const teacherUserId = authObj?.userId;

    if (!teacherUserId) {
      return NextResponse.json({ error: "Unauthorized: Please sign in" }, { status: 401 });
    }

    // 1. Verify Teacher role & authorized school_id
    const teacherRoleDoc = await runSingle(
      supabase
        .from("user_roles")
        .select("role, school_id")
        .eq("user_id", teacherUserId)
        .maybeSingle()
    );

    if (!teacherRoleDoc || !["teacher", "admin"].includes(teacherRoleDoc.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only teachers can access student progress reporting" },
        { status: 403 }
      );
    }

    const schoolId = teacherRoleDoc.school_id;
    if (!schoolId) {
      return NextResponse.json({
        progressReports: [],
        message: "Teacher account is not linked to any school ID.",
      });
    }

    console.log("========== TEACHER PROGRESS DEBUG ==========");
    console.log("teacherId:", teacherUserId);
    console.log("teacherRole:", teacherRoleDoc.role);
    console.log("teacherSchoolId:", schoolId);
    console.log("API endpoint: GET /api/teacher/student-progress");
    console.log("Supabase query filters: school_id =", schoolId);

    // 2. Fetch all students enrolled in this school
    let students = [];
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, name, class, created_at")
        .eq("school_id", schoolId)
        .eq("role", "student");

      if (error) {
        console.warn("[/api/teacher/student-progress] students query error:", error.message);
      } else {
        students = data || [];
      }
    } catch (e) {
      console.warn("[/api/teacher/student-progress] students query failed:", e.message);
    }

    if (students.length === 0) {
      return NextResponse.json({
        progressReports: [],
        schoolId,
      });
    }

    const studentIds = students.map((s) => s.user_id);
    const studentMap = {};
    students.forEach((s) => {
      studentMap[s.user_id] = s;
    });

    // 3. Fetch all learning_modules and lessons for this school
    let modules = [];
    let lessons = [];
    try {
      const { data: modData } = await supabase
        .from("learning_modules")
        .select("id, title, class, subject_id")
        .eq("school_id", schoolId);

      modules = modData || [];
    } catch (e) {
      console.warn("[/api/teacher/student-progress] modules query error:", e.message);
    }

    const moduleIds = modules.map((m) => m.id);
    const moduleMap = {};
    modules.forEach((m) => {
      moduleMap[m.id] = m;
    });

    if (moduleIds.length > 0) {
      try {
        const { data: lesData } = await supabase
          .from("lessons")
          .select("id, module_id, title, is_required, order_index")
          .in("module_id", moduleIds);

        lessons = lesData || [];
      } catch (e) {
        console.warn("[/api/teacher/student-progress] lessons query error:", e.message);
      }
    }

    const lessonIds = lessons.map((l) => l.id);
    const lessonMap = {};
    const moduleLessonsCount = {};

    lessons.forEach((l) => {
      lessonMap[l.id] = l;
      if (!moduleLessonsCount[l.module_id]) {
        moduleLessonsCount[l.module_id] = { total: 0, required: 0 };
      }
      moduleLessonsCount[l.module_id].total += 1;
      if (l.is_required !== false) {
        moduleLessonsCount[l.module_id].required += 1;
      }
    });

    // 4. Fetch all lesson_progress for students in this school
    let progressRecords = [];
    if (studentIds.length > 0 && lessonIds.length > 0) {
      try {
        const { data: progData } = await supabase
          .from("lesson_progress")
          .select("student_id, lesson_id, completed, completed_at, updated_at")
          .in("student_id", studentIds)
          .in("lesson_id", lessonIds);

        progressRecords = progData || [];
      } catch (e) {
        console.warn("[/api/teacher/student-progress] lesson_progress query error:", e.message);
      }
    }

    console.log("Progress records returned:", progressRecords.length);

    // 5. Aggregate progress per student per module
    // Key: `${studentId}_${moduleId}`
    const studentModuleProgress = {};

    progressRecords.forEach((prog) => {
      const lesson = lessonMap[prog.lesson_id];
      if (!lesson) return;

      const key = `${prog.student_id}_${lesson.module_id}`;
      if (!studentModuleProgress[key]) {
        studentModuleProgress[key] = {
          studentId: prog.student_id,
          moduleId: lesson.module_id,
          completedCount: 0,
          completedRequiredCount: 0,
          lastUpdatedAt: prog.updated_at || prog.completed_at,
        };
      }

      if (prog.completed) {
        studentModuleProgress[key].completedCount += 1;
        if (lesson.is_required !== false) {
          studentModuleProgress[key].completedRequiredCount += 1;
        }
      }

      if (prog.updated_at && new Date(prog.updated_at) > new Date(studentModuleProgress[key].lastUpdatedAt || 0)) {
        studentModuleProgress[key].lastUpdatedAt = prog.updated_at;
      }
    });

    // Build complete report list
    const reports = [];

    students.forEach((s) => {
      // Find modules matching student's class
      const matchingModules = modules.filter((m) => !m.class || m.class === s.class);

      matchingModules.forEach((mod) => {
        const key = `${s.user_id}_${mod.id}`;
        const prog = studentModuleProgress[key] || null;

        const totalLessons = moduleLessonsCount[mod.id]?.total || 0;
        const requiredLessons = moduleLessonsCount[mod.id]?.required || totalLessons;
        const completedLessons = prog?.completedCount || 0;

        const progressPercent =
          totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

        reports.push({
          studentId: s.user_id,
          studentName: s.name || "Unnamed Student",
          class: s.class || "Unassigned",
          moduleId: mod.id,
          moduleTitle: mod.title,
          completedLessons,
          totalLessons,
          requiredLessons,
          progressPercent,
          isCompleted: progressPercent === 100,
          lastUpdatedAt: prog?.lastUpdatedAt || null,
        });
      });
    });

    console.log("Raw API response:", {
      progressReportsCount: reports.length,
      totalStudents: students.length,
      totalModules: modules.length,
      schoolId,
    });

    return NextResponse.json({
      progressReports: reports,
      totalStudents: students.length,
      totalModules: modules.length,
      schoolId,
    });
  } catch (error) {
    console.error("[/api/teacher/student-progress] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch student progress reports" },
      { status: error.statusCode || 500 }
    );
  }
}
