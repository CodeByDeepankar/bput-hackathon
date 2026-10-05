import { NextResponse } from "next/server";
import { supabase, run } from "../../_utils/supabase";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classFilter = searchParams.get("class");
    const schoolId = searchParams.get("schoolId");
    const studentId = searchParams.get("studentId");

    let subjectQuery = supabase.from("subjects").select("*");
    if (classFilter) subjectQuery = subjectQuery.eq("class", classFilter);
    const subjects = await run(subjectQuery);

    const subjectIds = subjects.map((s) => s.id);
    const quizzes = await run(
      supabase
        .from("quizzes")
        .select("id, subject_id, school_id")
        .in("subject_id", subjectIds.length ? subjectIds : ["__none"])
    );

    const quizCountBySubject = quizzes.reduce((acc, quiz) => {
      acc[quiz.subject_id] = (acc[quiz.subject_id] || 0) + 1;
      return acc;
    }, {});

    let attemptsBySubject = {};
    if (studentId) {
      const responses = await run(
        supabase
          .from("quiz_responses")
          .select("quiz_id")
          .eq("student_id", studentId)
      );
      const quizLookup = quizzes.reduce((map, quiz) => {
        map[quiz.id] = quiz.subject_id;
        return map;
      }, {});
      for (const response of responses) {
        const subjectIdForQuiz = quizLookup[response.quiz_id];
        if (subjectIdForQuiz) {
          attemptsBySubject[subjectIdForQuiz] =
            (attemptsBySubject[subjectIdForQuiz] || 0) + 1;
        }
      }
    }

    const enriched = subjects
      .filter((subject) => !schoolId || !subject.school_id || subject.school_id === schoolId)
      .map((subject) => {
        const total = quizCountBySubject[subject.id] || 0;
        const attempted = attemptsBySubject[subject.id] || 0;
        const progress = total > 0 ? Math.round((attempted / total) * 100) : 0;
        return {
          id: subject.id,
          name: subject.name,
          class: subject.class,
          schoolId: subject.school_id,
          description: subject.description || "",
          quizCount: total,
          attempted,
          progress,
        };
      });

    return NextResponse.json({ count: enriched.length, subjects: enriched });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
