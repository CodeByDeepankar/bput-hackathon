"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import {
  CheckCircle2,
  XCircle,
  Trophy,
  Target,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Lock,
  Unlock,
  Clock,
  BookOpen,
  ArrowRight,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { fetchUserRole } from "@/lib/users";
import apiClient, { recordQuizCompletion } from "@/lib/api";

function formatDifficulty(value) {
  const normalized = typeof value === "string" ? value.toLowerCase() : "medium";
  if (normalized === "easy") return "Easy";
  if (normalized === "hard") return "Hard";
  return "Medium";
}

function getDifficultyColor(difficulty) {
  switch ((difficulty || "medium").toLowerCase()) {
    case "easy":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "hard":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "medium":
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

export default function QuizComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();

  const [roleDoc, setRoleDoc] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  // Quizzes list state
  const [classQuizzes, setClassQuizzes] = useState([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [quizzesError, setQuizzesError] = useState(null);

  // Direct target quiz state (when URL has ?id=... or ?quizId=...)
  const [activeQuizMeta, setActiveQuizMeta] = useState(null);
  const [lockedAccessError, setLockedAccessError] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);

  // Active quiz taking state
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizStarted, setQuizStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // 1. Load authenticated user role and student class
  useEffect(() => {
    if (!isLoaded) return;
    if (!user?.id) {
      setRoleDoc(null);
      setRoleLoading(false);
      return;
    }

    let active = true;
    setRoleLoading(true);
    fetchUserRole(user.id)
      .then((doc) => {
        if (!active) return;
        setRoleDoc(doc);
      })
      .catch((err) => {
        console.warn("fetchUserRole error:", err);
      })
      .finally(() => {
        if (active) setRoleLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isLoaded, user?.id]);

  const studentClass = useMemo(() => {
    return (
      roleDoc?.class ||
      user?.unsafeMetadata?.class ||
      user?.publicMetadata?.class ||
      null
    );
  }, [roleDoc?.class, user?.unsafeMetadata?.class, user?.publicMetadata?.class]);

  const studentName = useMemo(() => {
    return user?.fullName || roleDoc?.name || "Student";
  }, [user?.fullName, roleDoc?.name]);

  // 2. Fetch class quizzes for this student
  const fetchClassQuizzes = useCallback(async () => {
    if (!studentClass) return;
    try {
      setQuizzesLoading(true);
      setQuizzesError(null);
      const data = await apiClient.getQuizzes({ class: studentClass });
      setClassQuizzes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch class quizzes:", err);
      setQuizzesError(err?.message || "Unable to load quizzes");
      setClassQuizzes([]);
    } finally {
      setQuizzesLoading(false);
    }
  }, [studentClass]);

  useEffect(() => {
    if (!roleLoading) {
      fetchClassQuizzes();
    }
  }, [roleLoading, fetchClassQuizzes]);

  // 3. Direct URL handling: /student/quiz?id=xyz or ?quizId=xyz
  const targetQuizId = searchParams?.get("id") || searchParams?.get("quizId");

  const loadSpecificQuiz = useCallback(
    async (quizId) => {
      try {
        setQuizLoading(true);
        setLockedAccessError(null);
        setActiveQuizMeta(null);

        const res = await fetch(`/api/quizzes/${quizId}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          // Backend returned locked/forbidden (due to incomplete lessons, wrong class, or unpublished)
          setLockedAccessError(data);
          setActiveQuizMeta(data.quiz || null);
          return;
        }

        // Backend approved access and returned questions!
        setActiveQuizMeta(data);
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          setQuizQuestions(data.questions);
          setCurrentQuestionIndex(0);
          setUserAnswers({});
          setSelectedAnswer(null);
          setQuizStarted(true);
          setTimeRemaining(data.timeLimit ? Number(data.timeLimit) : 300);
        } else {
          setLockedAccessError({
            error: "No questions have been added to this quiz yet.",
            reason: "NO_QUESTIONS",
            quiz: data,
          });
        }
      } catch (err) {
        setLockedAccessError({
          error: err?.message || "Failed to load quiz details",
          reason: "NETWORK_ERROR",
        });
      } finally {
        setQuizLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (targetQuizId && !quizStarted && !lockedAccessError && !quizLoading) {
      loadSpecificQuiz(targetQuizId);
    }
  }, [targetQuizId, quizStarted, lockedAccessError, quizLoading, loadSpecificQuiz]);

  // Timer countdown during active quiz
  useEffect(() => {
    if (!quizStarted || timeRemaining === null || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto submit when time expires
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, timeRemaining]);

  const handleStartQuiz = (quizId) => {
    loadSpecificQuiz(quizId);
  };

  const handleAnswerSelect = (optionText) => {
    setSelectedAnswer(optionText);
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: optionText,
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setSelectedAnswer(userAnswers[nextIndex] || null);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      setSelectedAnswer(userAnswers[prevIndex] || null);
    }
  };

  const handleFinalSubmit = async () => {
    if (submittingQuiz || !activeQuizMeta) return;
    setSubmittingQuiz(true);

    try {
      const total = quizQuestions.length;
      let scoreCount = 0;

      // Note: Questions loaded for students don't expose correctAnswer directly on client
      // The backend /api/responses calculates the score securely
      const answersPayload = quizQuestions.reduce((acc, q, idx) => {
        if (q.id) {
          acc[q.id] = userAnswers[idx] || null;
        }
        return acc;
      }, {});

      // Call backend responses endpoint
      const response = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: activeQuizMeta.id,
          studentId: user?.id,
          answers: answersPayload,
          timeSpent: (activeQuizMeta.timeLimit || 300) - (timeRemaining || 0),
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Quiz submission failed");
      }

      // Navigate to results
      const finalScorePct = resData.score ?? 0;
      const params = new URLSearchParams({
        score: String(finalScorePct),
        topic: activeQuizMeta.title || "Quiz",
        total: String(resData.totalQuestions || total),
        correct: String(resData.correctAnswers || 0),
        quizId: activeQuizMeta.id,
      });

      router.push(`/student/quiz/results?${params.toString()}`);
    } catch (err) {
      alert("Submission error: " + err.message);
      setSubmittingQuiz(false);
    }
  };

  const handleBackToList = () => {
    setQuizStarted(false);
    setLockedAccessError(null);
    setActiveQuizMeta(null);
    setQuizQuestions([]);
    router.push("/student/quiz");
  };

  // -------------------------------------------------------------
  // STATE A: Loading profile or quiz
  // -------------------------------------------------------------
  if (roleLoading || quizLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#635BFF]" />
        <p className="text-xs font-semibold text-[#64748B]">
          {quizLoading ? "Checking quiz access & loading questions..." : "Loading student profile..."}
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE B: Locked Direct URL Access Card (Requirement 17 & 19)
  // -------------------------------------------------------------
  if (lockedAccessError) {
    const isClassMismatch = lockedAccessError.reason === "CLASS_MISMATCH";
    const quizTitle = lockedAccessError.quiz?.title || activeQuizMeta?.title || "Quiz Assessment";
    const moduleTitle = lockedAccessError.quiz?.moduleTitle || "Linked Learning Module";
    const completedCount = lockedAccessError.completedLessons ?? 0;
    const totalCount = lockedAccessError.totalLessons ?? 0;
    const progressPct = lockedAccessError.progress ?? 0;

    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card className="bg-white border-[#E2E8F0] shadow-md rounded-2xl overflow-hidden">
          <div className="bg-amber-500/10 border-b border-amber-500/20 p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#172033]">
                {isClassMismatch ? "Quiz Not Available For Your Class" : "Quiz Locked"}
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                {isClassMismatch
                  ? `This quiz is reserved for a different class.`
                  : `Complete all lessons in the linked module to unlock this assessment.`}
              </p>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F7F8FC] space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-[#172033] text-base">{quizTitle}</h3>
                  <p className="text-xs text-[#64748B]">Module: {moduleTitle}</p>
                </div>
                <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 text-[10px]">
                  🔒 Locked
                </Badge>
              </div>

              {!isClassMismatch && totalCount > 0 && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Module Progress</span>
                    <span className="font-bold text-[#635BFF]">{progressPct}%</span>
                  </div>
                  <Progress value={progressPct} className="h-2.5 bg-slate-200" />
                  <p className="text-[11px] text-[#64748B]">
                    {completedCount} of {totalCount} lessons completed
                  </p>
                </div>
              )}
            </div>

            <div className="text-xs text-[#64748B] space-y-2">
              <p className="font-medium text-slate-800">
                {lockedAccessError.error || "You do not have permission to view or take this quiz."}
              </p>
              {!isClassMismatch && (
                <p>
                  To maintain learning integrity, Gyanaratna requires 100% completion of all video lessons in{" "}
                  <strong>{moduleTitle}</strong> before unlocking the final assessment.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Button
                onClick={() => router.push("/student")}
                className="w-full sm:w-auto bg-[#635BFF] hover:bg-[#5148E5] text-white font-medium text-xs px-6 rounded-lg shadow-xs"
              >
                <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Continue Learning
              </Button>
              <Button
                variant="outline"
                onClick={handleBackToList}
                className="w-full sm:w-auto text-xs border-[#E2E8F0] rounded-lg"
              >
                Back to All Quizzes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE C: Active Quiz Taking Mode (Requirement 18 & 20)
  // -------------------------------------------------------------
  if (quizStarted && quizQuestions.length > 0) {
    const currentQ = quizQuestions[currentQuestionIndex];
    const totalQ = quizQuestions.length;
    const answeredCount = Object.keys(userAnswers).length;
    const progressPercent = Math.round(((currentQuestionIndex + 1) / totalQ) * 100);

    const minutes = Math.floor((timeRemaining || 0) / 60);
    const seconds = (timeRemaining || 0) % 60;

    return (
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-4">
        {/* Quiz Header Bar */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-[#635BFF] uppercase tracking-wider">
              {studentClass} • {activeQuizMeta?.subjectName || "Quiz Assessment"}
            </span>
            <h1 className="text-lg font-bold text-[#172033]">{activeQuizMeta?.title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-[#172033]">
              <Clock className="w-4 h-4 text-[#635BFF]" />
              <span>
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="p-6 border-b border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#64748B]">
                Question {currentQuestionIndex + 1} of {totalQ}
              </span>
              <div className="flex items-center gap-2">
                <Badge className={getDifficultyColor(currentQ?.difficulty)}>
                  {formatDifficulty(currentQ?.difficulty)}
                </Badge>
                {currentQ?.topic && (
                  <Badge variant="outline" className="text-[10px] text-[#64748B]">
                    {currentQ.topic}
                  </Badge>
                )}
              </div>
            </div>
            <Progress value={progressPercent} className="h-2 bg-slate-100" />
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <h2 className="text-base font-bold text-[#172033] whitespace-pre-wrap leading-relaxed">
              {currentQ?.text}
            </h2>

            {/* MCQ Options */}
            <div className="space-y-2.5">
              {(currentQ?.options || []).map((option, idx) => {
                const isSelected = selectedAnswer === option;
                return (
                  <div
                    key={idx}
                    onClick={() => handleAnswerSelect(option)}
                    className={`p-4 rounded-xl border text-sm font-medium cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-[#635BFF] bg-[#F1EEFF] text-[#172033] shadow-xs"
                        : "border-[#E2E8F0] bg-white hover:border-[#635BFF]/50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isSelected
                            ? "bg-[#635BFF] text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? "border-[#635BFF] bg-[#635BFF]" : "border-slate-300"
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex === 0}
                className="text-xs border-[#E2E8F0] rounded-lg"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>

              <div className="text-xs text-[#64748B]">
                {answeredCount} of {totalQ} answered
              </div>

              {currentQuestionIndex < totalQ - 1 ? (
                <Button
                  size="sm"
                  onClick={handleNextQuestion}
                  className="bg-[#635BFF] hover:bg-[#5148E5] text-white text-xs font-semibold px-4 rounded-lg shadow-xs"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleFinalSubmit}
                  disabled={submittingQuiz}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 rounded-lg shadow-xs"
                >
                  {submittingQuiz ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                    </span>
                  ) : (
                    "Submit Assessment"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE D: Student Class Quizzes Browser (Requirement 12, 19, 20, 37)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F7F8FC] py-8">
      <div className="max-w-6xl mx-auto space-y-6 px-4 lg:px-0">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#172033]">My Quizzes</h1>
              <Badge className="bg-[#635BFF]/10 text-[#635BFF] border-0 text-xs font-bold px-2.5 py-0.5">
                {studentClass}
              </Badge>
            </div>
            <p className="text-sm text-[#64748B] mt-0.5">
              Assessments for {studentClass} • Complete all module lessons to unlock quizzes
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/student")}
            className="text-xs border-[#E2E8F0] bg-white rounded-lg self-start sm:self-auto"
          >
            <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Back to Learning Modules
          </Button>
        </div>

        {/* Quizzes List Container */}
        <Card className="bg-white border-[#E2E8F0] shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="bg-white border-b border-[#E2E8F0] py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-[#172033] text-base font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#635BFF]" />
              Available Class Assessments
            </CardTitle>
            <span className="text-xs text-[#64748B]">
              Showing {classQuizzes.length} {classQuizzes.length === 1 ? "Quiz" : "Quizzes"}
            </span>
          </CardHeader>

          <CardContent className="p-6">
            {!studentClass ? (
              <div className="py-16 text-center text-[#64748B] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto text-amber-500">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-[#172033] text-base">Class Not Set</h3>
                <p className="text-xs max-w-md mx-auto">
                  Please select your class in your student profile or onboarding to view curriculum quizzes for your class.
                </p>
                <Button
                  onClick={() => router.push("/role-select")}
                  className="bg-[#635BFF] hover:bg-[#5148E5] text-white text-xs px-5 rounded-lg shadow-xs"
                >
                  Set Class
                </Button>
              </div>
            ) : quizzesLoading ? (
              <div className="py-16 text-center text-[#64748B] flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#635BFF]" />
                <p className="text-xs font-medium">Loading quizzes for {studentClass}...</p>
              </div>
            ) : quizzesError ? (
              <div className="py-12 text-center text-red-600 text-xs space-y-2">
                <AlertCircle className="w-6 h-6 mx-auto" />
                <p>{quizzesError}</p>
                <Button size="sm" variant="outline" onClick={fetchClassQuizzes} className="text-xs">
                  Retry
                </Button>
              </div>
            ) : classQuizzes.length === 0 ? (
              <div className="py-16 text-center text-[#64748B] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-[#172033] text-base">No Quizzes Published Yet</h3>
                <p className="text-xs max-w-md mx-auto">
                  Your teachers have not published any assessments for {studentClass} yet. Check back once you have
                  completed your learning modules!
                </p>
                <Button
                  onClick={() => router.push("/student")}
                  className="bg-[#635BFF] hover:bg-[#5148E5] text-white text-xs px-5 rounded-lg shadow-xs"
                >
                  Explore Lessons
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classQuizzes.map((quiz) => {
                  const isUnlocked = Boolean(quiz.isUnlocked || quiz.unlocked);
                  const completedCount = quiz.completedLessons ?? 0;
                  const totalCount = quiz.totalLessons ?? 0;
                  const progressPct = quiz.progress ?? 0;
                  const moduleTitle = quiz.moduleTitle || "Learning Module";
                  const subjectName = quiz.subjectName || "Subject";

                  return (
                    <div
                      key={quiz.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                        isUnlocked
                          ? "border-[#22C55E]/30 bg-[#ECFDF3]/30 hover:border-[#22C55E]/60 shadow-xs"
                          : "border-[#E2E8F0] bg-white hover:border-[#635BFF]/30 shadow-xs"
                      }`}
                    >
                      {/* Top Header */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-[11px] font-bold text-[#635BFF]">{studentClass}</span>
                              <span className="text-[#CBD5E1]">•</span>
                              <span className="text-[11px] font-semibold text-slate-600">{subjectName}</span>
                            </div>
                            <h3 className="font-bold text-[#172033] text-base leading-snug">{quiz.title}</h3>
                          </div>

                          <Badge
                            className={`text-[10px] font-bold px-2 py-0.5 uppercase shrink-0 ${
                              isUnlocked
                                ? "bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {isUnlocked ? "🔓 Unlocked" : "🔒 Locked"}
                          </Badge>
                        </div>

                        <div className="text-xs text-[#64748B] flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                          <span>Module: {moduleTitle}</span>
                        </div>

                        {quiz.description && (
                          <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">
                            {quiz.description}
                          </p>
                        )}
                      </div>

                      {/* Progress Section */}
                      <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className={isUnlocked ? "text-emerald-700" : "text-slate-600"}>
                            {isUnlocked ? "✓ All lessons completed!" : "Module Lesson Progress"}
                          </span>
                          <span className={isUnlocked ? "text-emerald-700 font-bold" : "text-[#635BFF] font-bold"}>
                            {progressPct}%
                          </span>
                        </div>

                        <Progress
                          value={progressPct}
                          className={`h-2 ${isUnlocked ? "bg-emerald-100" : "bg-slate-100"}`}
                        />

                        <div className="text-[11px] text-[#64748B]">
                          {completedCount} of {totalCount} lessons completed
                        </div>
                      </div>

                      {/* Bottom Action Button */}
                      <div className="pt-1 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{quiz.timeLimit ? `${Math.round(quiz.timeLimit / 60)} min` : "Self-paced"}</span>
                        </div>

                        {isUnlocked ? (
                          <Button
                            size="sm"
                            onClick={() => handleStartQuiz(quiz.id)}
                            className="bg-[#635BFF] hover:bg-[#5148E5] text-white font-bold text-xs px-4 rounded-lg shadow-xs"
                          >
                            Start Quiz <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push("/student")}
                            className="text-xs border-[#E2E8F0] text-slate-700 hover:bg-slate-50 rounded-lg"
                          >
                            <BookOpen className="w-3.5 h-3.5 mr-1" /> Continue Learning
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
