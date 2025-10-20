import { NextResponse } from "next/server";
import { supabase, run, runSingle, normalizeId, nowIso } from "../_utils/supabase";
import { recordQuizCompletionInternal } from "../_utils/quiz";
import { broadcast } from "../_utils/events";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { quizId, studentId, answers, timeSpent = 0 } = await request.json();
    if (!quizId || !studentId || !answers) {
      return NextResponse.json({ error: "quizId, studentId, and answers are required" }, { status: 400 });
    }

    const quiz = await runSingle(
      supabase.from("quizzes").select("id, subject_id").eq("id", quizId).maybeSingle()
    );
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const questions = await run(
      supabase
        .from("questions")
        .select("id, text, options, correct_answer, explanation")
        .eq("quiz_id", quizId)
    );

    let correctAnswers = 0;
    const detailedResults = [];
    for (const question of questions) {
      const studentAnswer = answers[question.id];
      const isCorrect = studentAnswer === question.correct_answer;
      if (isCorrect) correctAnswers++;
      detailedResults.push({
        questionId: question.id,
        questionText: question.text,
        studentAnswer,
        correctAnswer: question.correct_answer,
        isCorrect,
        explanation: question.explanation,
      });
    }

    const totalQuestions = questions.length;
    const scorePercentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    const responseId = normalizeId("response", `${studentId}:${quizId}`);
    const responseDoc = {
      id: responseId,
      quiz_id: quizId,
      student_id: studentId,
      answers,
      score: scorePercentage,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      time_spent: timeSpent,
      submitted_at: nowIso(),
    };

    await run(supabase.from("quiz_responses").insert(responseDoc));

    await recordQuizCompletionInternal({
      userId: studentId,
      quizId,
      score: scorePercentage,
      timeSpent,
      subject: quiz.subject_id,
    });

    broadcast("quiz.attempted", {
      quizId,
      studentId,
      score: scorePercentage,
      correctAnswers,
      totalQuestions,
      submittedAt: responseDoc.submitted_at,
    });

    return NextResponse.json({
      success: true,
      responseId,
      score: scorePercentage,
      correctAnswers,
      totalQuestions,
      results: detailedResults,
      message: `Quiz completed! You scored ${Math.round(scorePercentage)}%`,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
