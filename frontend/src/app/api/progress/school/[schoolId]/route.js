import { NextResponse } from "next/server";
import { supabase, run } from "../../../_utils/supabase";

export const runtime = "nodejs";

export async function GET(_request, context) {
  try {
    const { schoolId } = await context.params;

    const students = await run(
      supabase
        .from("user_roles")
        .select("user_id, name, class")
        .eq("school_id", schoolId)
        .eq("role", "student")
    );

    const studentIds = students.map((student) => student.user_id);
    const responses = studentIds.length
      ? await run(
          supabase
            .from("quiz_responses")
            .select("student_id, score, submitted_at")
            .in("student_id", studentIds)
        )
      : [];

    const grouped = responses.reduce((acc, resp) => {
      if (!acc[resp.student_id]) acc[resp.student_id] = [];
      acc[resp.student_id].push(resp);
      return acc;
    }, {});

    const schoolProgress = students.map((student) => {
      const scores = grouped[student.user_id] || [];
      const totalQuizzes = scores.length;
      const averageScore = totalQuizzes
        ? scores.reduce((sum, row) => sum + row.score, 0) / totalQuizzes
        : 0;
      const bestScore = totalQuizzes ? Math.max(...scores.map((row) => row.score)) : 0;
      const lastActivity = totalQuizzes
        ? new Date(
            Math.max(...scores.map((row) => new Date(row.submitted_at).getTime()))
          ).toISOString()
        : null;

      return {
        studentId: student.user_id,
        name: student.name,
        class: student.class,
        totalQuizzes,
        averageScore: Math.round(averageScore * 100) / 100,
        bestScore: Math.round(bestScore * 100) / 100,
        lastActivity,
      };
    });

    const studentsWithActivity = schoolProgress.filter((s) => s.totalQuizzes > 0).length;
    const schoolAverage = schoolProgress.length
      ? schoolProgress.reduce((sum, entry) => sum + entry.averageScore, 0) / schoolProgress.length
      : 0;

    return NextResponse.json({
      schoolId,
      totalStudents: students.length,
      studentsWithActivity,
      schoolAverage,
      students: schoolProgress.sort((a, b) => b.averageScore - a.averageScore),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
