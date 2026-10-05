"use client";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@teacher/components/ui/button";
import { Card, CardContent } from "@teacher/components/ui/card";
import { clampPercent, formatDateTime, formatLastActivity, formatPercent } from "@/lib/studentFormat";
import { useStudentProgress } from "@/hooks/useApi";

function safeNumber(value, fallback = 0) {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

function chooseArray(...candidates) {
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length) return candidate;
  }
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

const STUDENT_ID_KEYS = ["studentId", "id", "userId", "uuid", "uid", "_id", "externalId"];

function matchesStudentId(candidate, targetId) {
  if (!candidate || typeof candidate !== "object" || targetId == null) return false;
  const normalizedTarget = String(targetId).trim().toLowerCase();
  if (!normalizedTarget) return false;
  return STUDENT_ID_KEYS.some((key) => {
    const value = candidate[key];
    if (value == null) return false;
    return String(value).trim().toLowerCase() === normalizedTarget;
  });
}

function pickFirstField(objects, keys) {
  for (const key of keys) {
    for (const obj of objects) {
      const value = obj?.[key];
      if (value != null && value !== "") {
        return typeof value === "string" ? value : String(value);
      }
    }
  }
  return null;
}

function resolveStudentDetails(progress, studentId, extraCandidates = []) {
  if (!progress && (!extraCandidates || !extraCandidates.length)) {
    return studentId ? { id: studentId } : null;
  }

  const normalizedExtras = Array.isArray(extraCandidates)
    ? extraCandidates.filter(Boolean)
    : [];

  const directCandidates = [
    ...normalizedExtras,
    progress?.student,
    progress?.profile,
    progress?.user,
    progress?.studentInfo,
    progress?.details,
    progress?.summary?.student,
  ].filter(Boolean);

  const listCandidates = chooseArray(
    progress?.students,
    progress?.learners,
    progress?.roster,
    progress?.participants,
    progress?.enrolledStudents,
    progress?.records,
    progress?.entries,
    progress?.items,
  );
  const arrayCandidates = Array.isArray(listCandidates) ? listCandidates : [];

  const searchSpace = [...directCandidates, ...arrayCandidates];
  const matched = searchSpace.find((entry) => matchesStudentId(entry, studentId));
  const primary = matched || directCandidates[0] || arrayCandidates[0] || null;
  const allCandidates = primary ? [primary, ...searchSpace] : searchSpace;

  const name = pickFirstField(allCandidates, [
    "name",
    "fullName",
    "displayName",
    "studentName",
    "firstName",
    "username",
  ]);
  const className = pickFirstField(allCandidates, [
    "className",
    "class",
    "grade",
    "gradeLevel",
    "section",
  ]);
  const schoolName = pickFirstField(allCandidates, ["schoolName", "school", "institute", "college"]);
  const email = pickFirstField(allCandidates, ["email", "emailAddress", "email_id"]);
  const inferredId = pickFirstField(allCandidates, STUDENT_ID_KEYS);

  if (!primary && !name && !className && !schoolName && !email && !inferredId) {
    return studentId ? { id: studentId } : null;
  }

  const base = primary ? { ...primary } : {};
  return {
    ...base,
    id: inferredId ?? studentId ?? base.id,
    name: name ?? base.name ?? base.fullName ?? (studentId ? `Student ${studentId}` : undefined),
    className: className ?? base.className ?? base.class ?? null,
    schoolName: schoolName ?? base.schoolName ?? base.school ?? null,
    email: email ?? base.email ?? base.emailAddress ?? null,
  };
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function buildSummary(progress, attempts) {
  const summary = progress?.summary || progress?.stats || progress?.metrics || {};
  const lastAttempt = attempts?.length ? attempts[0] : null;
  const lastActivity = summary.lastActivity || progress?.lastActivity || lastAttempt?.completedAt || lastAttempt?.finishedAt || lastAttempt?.timestamp || null;
  const totalQuizzes = summary.totalQuizzes ?? progress?.totalQuizzes ?? progress?.quizCount ?? attempts?.length ?? 0;
  const averageScore = summary.averageScore ?? summary.avgScore ?? progress?.averageScore ?? progress?.avgScore ?? 0;
  const bestScore = summary.bestScore ?? summary.highestScore ?? progress?.bestScore ?? progress?.highestScore ?? null;
  const streak = summary.streak ?? progress?.streak ?? progress?.currentStreak ?? progress?.streakCount ?? null;
  const learningMinutes = summary.learningMinutes ?? progress?.learningMinutes ?? progress?.totalLearningMinutes ?? null;

  return {
    totalQuizzes: safeNumber(totalQuizzes, 0),
    averageScore: clampPercent(safeNumber(averageScore, 0)),
    bestScore: bestScore != null ? clampPercent(safeNumber(bestScore, 0)) : null,
    streak: streak != null ? safeNumber(streak, 0) : null,
    learningMinutes: learningMinutes != null ? safeNumber(learningMinutes, 0) : null,
    lastActivity,
  };
}

function scoreRemark(percent) {
  const score = clampPercent(safeNumber(percent, 0));
  if (score >= 90) return "Outstanding mastery";
  if (score >= 80) return "Great understanding";
  if (score >= 70) return "Solid foundation; keep refining";
  if (score >= 60) return "Needs targeted revision";
  if (score > 0) return "Requires additional support";
  return "No data available";
}

function buildAcademicRows(progress, attempts) {
  const academicSources = chooseArray(
    progress?.subjects,
    progress?.subjectPerformance,
    progress?.subjectStats,
    progress?.courses,
    progress?.modules,
    progress?.grades,
  );

  const fromSubjects = Array.isArray(academicSources)
    ? academicSources.map((item, index) => {
        const subject = item?.subject || item?.name || item?.title || `Subject ${index + 1}`;
        const rawScore = item?.marks ?? item?.score ?? item?.percentage ?? item?.percent ?? item?.avgScore ?? null;
        const score = rawScore != null ? clampPercent(safeNumber(rawScore, 0)) : null;
        const remark = item?.remarks || item?.feedback || (score != null ? scoreRemark(score) : "No remarks yet");
        return {
          subject,
          score,
          remark,
        };
      })
    : [];

  if (fromSubjects.length) {
    return fromSubjects.slice(0, 8);
  }

  // Fallback: derive from recent quiz attempts
  const derived = attempts.slice(0, 6).map((attempt, index) => {
    const subject = attempt.title || `Quiz ${index + 1}`;
    const score = attempt.score != null ? clampPercent(safeNumber(attempt.score, 0)) : null;
    const remark = score != null ? scoreRemark(score) : "Review pending";
    return { subject, score, remark };
  });

  return derived;
}

function buildSkillRows(progress) {
  const skillsSources = chooseArray(
    progress?.skills,
    progress?.competencies,
    progress?.skillProgress,
    progress?.capabilities,
  );

  const skills = Array.isArray(skillsSources)
    ? skillsSources.map((item, index) => {
        const name = item?.name || item?.skill || item?.title || `Skill ${index + 1}`;
        const level = item?.level || item?.currentLevel || item?.proficiency || item?.state || "Unspecified";
        const trend = item?.trend || item?.progress || item?.delta || null;
        let trendLabel = "";
        if (typeof trend === "string") {
          trendLabel = trend;
        } else if (typeof trend === "number") {
          trendLabel = trend > 0 ? "Improving" : trend < 0 ? "Needs attention" : "Stable";
        }
        return {
          name,
          level,
          trend: trendLabel,
        };
      })
    : [];

  if (skills.length) {
    return skills.slice(0, 8);
  }

  // Fallback with common baseline skills
  return [
    { name: "Algorithmic Thinking", level: "Developing", trend: "Focus on daily practice" },
    { name: "Python Projects", level: "Intermediate", trend: "Build practical mini-projects" },
    { name: "Version Control", level: "Beginner", trend: "Increase Git usage" },
  ];
}

function extractAiFeedback(progress) {
  if (!progress) return null;
  const message = progress.aiFeedback || progress.feedback || progress.aiSummary || progress.recommendation;
  if (Array.isArray(message)) {
    return message.join(" \n");
  }
  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }
  return "Keep strengthening problem-solving habits with daily practice and reflective review of quiz mistakes.";
}

function extractGoals(progress) {
  const goalsSource = chooseArray(
    progress?.nextGoals,
    progress?.goals,
    progress?.actionItems,
    progress?.recommendations,
  );

  if (Array.isArray(goalsSource) && goalsSource.length) {
    return goalsSource
      .map((goal, index) => {
        if (typeof goal === "string") return goal;
        if (goal && typeof goal === "object") {
          return goal.title || goal.text || goal.description || `Goal ${index + 1}`;
        }
        return `Goal ${index + 1}`;
      })
      .filter(Boolean)
      .slice(0, 6);
  }

  return [
    "Solve three algorithmic problems each day to build confidence",
    "Prototype a mini project that applies current coursework",
    "Review core operating-system scheduling patterns",
    "Commit code to Git frequently to grow collaboration habits",
  ];
}

function mapAttempts(rawAttempts = []) {
  const sortable = rawAttempts
    .map((item, index) => {
      const completedAt = item.completedAt || item.finishedAt || item.timestamp || item.date || null;
      const score = item.score ?? item.percentage ?? item.avgScore ?? null;
      const title = item.quizName || item.quizTitle || item.title || item.name || `Quiz ${index + 1}`;
      return {
        id: item.id || item.responseId || item.quizId || `${index}`,
        title,
        score,
        totalQuestions: item.totalQuestions ?? item.questionCount ?? null,
        correct: item.correct ?? item.correctAnswers ?? null,
        completedAt,
      };
    })
    .sort((a, b) => {
      const left = toDate(b.completedAt)?.getTime() ?? 0;
      const right = toDate(a.completedAt)?.getTime() ?? 0;
      return left - right;
    });

  return sortable.slice(0, 15);
}

export default function StudentReportView({
  studentId,
  backHref = null,
  title = "Student Report",
  downloadLabel = "Download PDF",
  candidateStudents = [],
}) {
  const { progress, loading, error } = useStudentProgress(studentId);
  const [downloading, setDownloading] = useState(false);

  const candidateList = useMemo(
    () => (Array.isArray(candidateStudents) ? candidateStudents : []),
    [candidateStudents],
  );

  const student = useMemo(
    () => resolveStudentDetails(progress, studentId, candidateList),
    [progress, studentId, candidateList],
  );
  const attempts = useMemo(() => mapAttempts(
    chooseArray(
      progress?.recentQuizzes,
      progress?.attempts,
      progress?.quizHistory,
      progress?.quizzes,
      progress?.recentAttempts
    )
  ), [progress]);

  const summary = useMemo(() => buildSummary(progress, attempts), [progress, attempts]);
  const academicRows = useMemo(() => buildAcademicRows(progress, attempts), [progress, attempts]);
  const skillRows = useMemo(() => buildSkillRows(progress), [progress]);
  const aiFeedback = useMemo(() => extractAiFeedback(progress), [progress]);
  const nextGoals = useMemo(() => extractGoals(progress), [progress]);

  const handleDownload = useCallback(async () => {
    if (!studentId) return;
    try {
      setDownloading(true);
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const fallbackName = studentId ? `Student ${studentId}` : "Student";
      const studentName = student?.name || student?.id || fallbackName;
      const className = student?.className || "";
      const email = student?.email || "";
      const school = student?.schoolName || "";

      doc.setFontSize(16);
      doc.text(`Student Performance Report`, 14, 20);
      doc.setFontSize(12);
      doc.text(`Name: ${studentName}`, 14, 32);
      if (className) doc.text(`Class: ${className}`, 14, 40);
      if (school) doc.text(`School: ${school}`, 14, 48);
      if (email) doc.text(`Email: ${email}`, 14, 56);

      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 68);
      doc.text(`Total Quizzes: ${summary.totalQuizzes}`, 14, 80);
      doc.text(`Average Score: ${formatPercent(summary.averageScore)}`, 14, 88);
      if (summary.bestScore != null) doc.text(`Best Score: ${formatPercent(summary.bestScore)}`, 14, 96);
      if (summary.streak != null) doc.text(`Current Streak: ${summary.streak}`, 14, 104);
      if (summary.learningMinutes != null) doc.text(`Learning Minutes: ${summary.learningMinutes}`, 14, 112);
      doc.text(`Last Activity: ${formatLastActivity(summary.lastActivity)}`, 14, 120);

      let cursorY = 134;
      doc.setFontSize(14);
      doc.text("Academic Performance", 14, cursorY);
      doc.setFontSize(11);
      cursorY += 8;
      if (academicRows.length) {
        academicRows.forEach((row) => {
          const scoreLabel = row.score != null ? `${row.score}%` : "--";
          const line = `${row.subject}: ${scoreLabel} — ${row.remark}`;
          doc.text(line, 18, cursorY, { maxWidth: 174 });
          cursorY += 7;
        });
      } else {
        doc.text("No academic summaries available yet.", 18, cursorY);
        cursorY += 7;
      }

      cursorY += 5;
      doc.setFontSize(14);
      doc.text("Skill Development", 14, cursorY);
      cursorY += 8;
      doc.setFontSize(11);
      skillRows.forEach((row) => {
        const trendLabel = row.trend ? ` (${row.trend})` : "";
        doc.text(`${row.name}: ${row.level}${trendLabel}`, 18, cursorY, { maxWidth: 174 });
        cursorY += 7;
      });

      cursorY += 5;
      doc.setFontSize(14);
      doc.text("AI Feedback", 14, cursorY);
      cursorY += 8;
      doc.setFontSize(11);
      const feedbackLines = (aiFeedback || "").split(/\n+/);
      feedbackLines.forEach((line) => {
        doc.text(line.trim(), 18, cursorY, { maxWidth: 174 });
        cursorY += 7;
      });

      cursorY += 5;
      doc.setFontSize(14);
      doc.text("Next Goals", 14, cursorY);
      cursorY += 8;
      doc.setFontSize(11);
      nextGoals.forEach((goal, index) => {
        doc.text(`${index + 1}. ${goal}`, 18, cursorY, { maxWidth: 174 });
        cursorY += 7;
      });

      cursorY += 5;
      doc.setFontSize(14);
      doc.text("Recent Quiz Activity", 14, cursorY);
      cursorY += 8;
      doc.setFontSize(11);
      attempts.slice(0, 6).forEach((attempt, idx) => {
        const label = `${attempt.title} - ${formatPercent(attempt.score ?? 0)} (${formatDateTime(attempt.completedAt)})`;
        doc.text(label, 18, cursorY, { maxWidth: 174 });
        cursorY += 7;
      });

      doc.save(`student-${studentId}-report.pdf`);
    } catch (err) {
      console.error("Failed to export student report", err);
      // eslint-disable-next-line no-alert
      alert("Sorry, we could not generate the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }, [attempts, student, studentId, summary]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-white/90 font-semibold text-2xl mb-4">{title}</div>
      <div className="flex flex-wrap justify-between gap-3 mb-6">
        <div className="text-sm text-white/80 max-w-xl">
          {student?.name || student?.id || studentId
            ? `Reviewing ${student?.name || student?.id || studentId}`
            : "Student performance overview"}
        </div>
        <div className="flex gap-2">
          {backHref ? (
            <Button asChild variant="outline" size="sm" className="bg-white">
              <Link href={backHref}>Back to students</Link>
            </Button>
          ) : null}
          <Button onClick={handleDownload} disabled={downloading || !studentId} className="bg-violet-600 hover:bg-violet-700">
            {downloading ? "Preparing PDF..." : downloadLabel}
          </Button>
        </div>
      </div>

      <Card className="mb-6 border-none shadow-md overflow-hidden bg-gradient-to-r from-indigo-500 via-sky-500 to-violet-500 text-white">
        <CardContent className="p-6">
          {loading ? (
            <div className="text-white/90">Loading student report...</div>
          ) : error ? (
            <div className="text-red-100">{error}</div>
          ) : !progress ? (
            <div className="text-white/90">No report data available for this student yet.</div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="text-2xl font-semibold">{student?.name || student?.id || studentId || "Student"}</div>
                  <div className="text-sm text-white/80">
                    {student?.className ? `${student.className} • ` : ""}
                    {student?.schoolName ? `${student.schoolName}` : ""}
                  </div>
                </div>
                <div className="text-sm text-white/80 space-y-1">
                  {student?.email ? <div>Email: {student.email}</div> : null}
                  {summary.lastActivity ? <div>Last Activity: {formatLastActivity(summary.lastActivity)}</div> : null}
                  <div>Total Quizzes: {summary.totalQuizzes}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <div className="rounded-lg bg-white/15 p-3">
                  <div className="text-xs uppercase tracking-wide text-white/70">Average Score</div>
                  <div className="text-2xl font-semibold">{formatPercent(summary.averageScore)}</div>
                </div>
                <div className="rounded-lg bg-white/15 p-3">
                  <div className="text-xs uppercase tracking-wide text-white/70">Best Score</div>
                  <div className="text-2xl font-semibold">{summary.bestScore != null ? formatPercent(summary.bestScore) : "--"}</div>
                </div>
                <div className="rounded-lg bg-white/15 p-3">
                  <div className="text-xs uppercase tracking-wide text-white/70">Current Streak</div>
                  <div className="text-2xl font-semibold">{summary.streak != null ? summary.streak : "--"}</div>
                </div>
                <div className="rounded-lg bg-white/15 p-3">
                  <div className="text-xs uppercase tracking-wide text-white/70">Learning Minutes</div>
                  <div className="text-2xl font-semibold">{summary.learningMinutes != null ? summary.learningMinutes : "--"}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 bg-white/95 border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3">
              <div className="text-lg font-semibold text-slate-900">Academic Performance</div>
              <div className="text-sm text-slate-500">Snapshot of subject mastery and suggested next steps</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Subject</th>
                    <th className="py-2 pr-4">Marks</th>
                    <th className="py-2">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {academicRows.length ? (
                    academicRows.map((row, index) => (
                      <tr key={`${row.subject}-${index}`} className="border-t border-slate-200 text-slate-700">
                        <td className="py-2 pr-4 font-medium">{row.subject}</td>
                        <td className="py-2 pr-4">{row.score != null ? `${row.score}%` : "--"}</td>
                        <td className="py-2">{row.remark}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-500">
                        Academic insights will appear once this learner completes more tracked assessments.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/95 border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3">
              <div className="text-lg font-semibold text-slate-900">Skill Development</div>
              <div className="text-sm text-slate-500">Competency growth across core technical areas</div>
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              {skillRows.map((row, index) => (
                <div key={`${row.name}-${index}`} className="border border-slate-200 rounded-lg px-3 py-2">
                  <div className="font-medium text-slate-900">{row.name}</div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Current Level: <b className="text-slate-700">{row.level}</b></span>
                    {row.trend ? <span>{row.trend}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="bg-white/95 border-slate-200 shadow-sm lg:col-span-2">
          <CardContent className="p-5">
            <div className="text-lg font-semibold text-slate-900 mb-2">AI Feedback</div>
            <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
              {aiFeedback}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/95 border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="text-lg font-semibold text-slate-900 mb-2">Next Goals</div>
            <ul className="text-sm text-slate-700 space-y-2 list-disc list-inside">
              {nextGoals.map((goal, index) => (
                <li key={`${goal}-${index}`}>{goal}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/95 border-slate-200 shadow-sm">
        <CardContent className="p-5">
          <div className="text-lg font-semibold text-slate-900 mb-3">Recent Quiz Activity</div>
          {attempts.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Quiz</th>
                    <th className="py-2 pr-4">Score</th>
                    <th className="py-2 pr-4">Questions</th>
                    <th className="py-2">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt) => (
                    <tr key={attempt.id} className="border-t border-slate-200 text-slate-700">
                      <td className="py-2 pr-4 font-medium">{attempt.title}</td>
                      <td className="py-2 pr-4">{attempt.score != null ? formatPercent(attempt.score) : "--"}</td>
                      <td className="py-2 pr-4">
                        {attempt.totalQuestions != null ? (
                          <span>{attempt.correct != null ? `${attempt.correct}/${attempt.totalQuestions}` : attempt.totalQuestions}</span>
                        ) : "--"}
                      </td>
                      <td className="py-2">{attempt.completedAt ? formatDateTime(attempt.completedAt) : "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-slate-600">No quiz activity recorded yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
