"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/nextjs";
import { fetchUserRole } from "@/lib/users";
import { useSchoolProgress } from "@/hooks/useApi";
import { useRealtimeQuizProgress } from "@/hooks/useRealtimeQuizProgress";
import { Card, CardContent } from "@teacher/components/ui/card";
import { Input } from "@teacher/components/ui/input";
import { Badge } from "@teacher/components/ui/badge";
import { Avatar, AvatarFallback } from "@teacher/components/ui/avatar";

function initials(value) {
  const parts = String(value || "?").trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? parts[1]?.[0] : null;
  return `${first ?? "?"}${second ?? ""}`.toUpperCase();
}

function clampPercent(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function formatLastActivity(value) {
  if (!value) return "No quiz activity yet";
  const ts = new Date(value);
  if (Number.isNaN(ts.getTime())) return "No quiz activity yet";
  const diffMs = Date.now() - ts.getTime();
  if (diffMs < 0) return "Scheduled";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return ts.toLocaleDateString();
}

function StudentCard({ student }) {
  const progress = clampPercent(student.averageScore);
  const badgeValue = student.bestScore != null ? clampPercent(student.bestScore) : progress;
  return (
    <Card className="bg-white/95 border-slate-200 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar>
            <AvatarFallback>{initials(student.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="font-medium text-slate-900 truncate">{student.name}</div>
              <Badge className="bg-violet-600 text-white">{badgeValue}%</Badge>
            </div>
            <div className="text-xs text-slate-500 mb-2">{student.className}</div>
            <div className="text-sm text-slate-700 flex items-center gap-6">
              <span>Quizzes <b>{student.totalQuizzes}</b></span>
              <span>Avg Score <span className="text-emerald-600 font-semibold">{progress}%</span></span>
            </div>
            <div className="text-sm mt-1">Last Activity <b>{formatLastActivity(student.lastActivity)}</b></div>
            <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-violet-600" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StudentsContent() {
  const { user, isSignedIn, isLoaded } = useUser();
  const [roleDoc, setRoleDoc] = useState(null);
  const [roleError, setRoleError] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("All Classes");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user?.id) {
      setRoleDoc(null);
      setRoleError(null);
      setRoleLoading(false);
      return;
    }
    let active = true;
    setRoleLoading(true);
    setRoleError(null);
    fetchUserRole(user.id)
      .then((doc) => {
        if (!active) return;
        setRoleDoc(doc);
      })
      .catch((error) => {
        if (!active) return;
        setRoleDoc(null);
        setRoleError(error?.message || "Unable to load role");
      })
      .finally(() => {
        if (active) setRoleLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, user?.id]);

  const schoolId = roleDoc?.schoolId || roleDoc?.school_id || null;
  const {
    schoolProgress,
    loading: progressLoading,
    error: progressError,
    fetchSchoolProgress,
  } = useSchoolProgress(schoolId);

  const handleRealtimeQuiz = useCallback(() => {
    if (!schoolId) return;
    fetchSchoolProgress();
  }, [fetchSchoolProgress, schoolId]);

  useRealtimeQuizProgress({ schoolId, onQuizEvent: handleRealtimeQuiz });

  const students = useMemo(() => {
    if (!schoolProgress?.students) return [];
    return schoolProgress.students.map((student) => ({
      id: student.studentId || student.userId || student.id,
      name: student.name || "Unnamed Student",
      className: student.class || "Unassigned Class",
      totalQuizzes: student.totalQuizzes ?? 0,
      averageScore: typeof student.averageScore === "number" ? student.averageScore : 0,
      bestScore: typeof student.bestScore === "number" ? student.bestScore : null,
      lastActivity: student.lastActivity || null,
    }));
  }, [schoolProgress?.students]);

  const classOptions = useMemo(() => {
    const unique = new Set();
    students.forEach((student) => {
      if (student.className) unique.add(student.className);
    });
    return ["All Classes", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [students]);

  useEffect(() => {
    if (!classOptions.includes(selectedClass)) {
      setSelectedClass("All Classes");
    }
  }, [classOptions, selectedClass]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students
      .filter((student) => {
        const matchesQuery = !query || student.name.toLowerCase().includes(query) || student.className.toLowerCase().includes(query);
        const matchesClass = selectedClass === "All Classes" || student.className === selectedClass;
        return matchesQuery && matchesClass;
      })
      .sort((a, b) => clampPercent(b.averageScore) - clampPercent(a.averageScore));
  }, [students, search, selectedClass]);

  if (!isSignedIn) {
    return null;
  }

  if (roleLoading) {
    return (
      <div className="max-w-6xl mx-auto text-white/90">Loading teacher profile...</div>
    );
  }

  if (roleError) {
    return (
      <Card className="max-w-xl mx-auto bg-white/95 border-slate-200">
        <CardContent className="p-6 text-center text-slate-700">
          <div className="text-lg font-semibold mb-2">Unable to load teacher data</div>
          <div>{roleError}</div>
        </CardContent>
      </Card>
    );
  }

  const role = typeof roleDoc === "string" ? roleDoc : roleDoc?.role;
  if (role && !["teacher", "admin"].includes(role)) {
    return (
      <Card className="max-w-xl mx-auto bg-white/95 border-slate-200">
        <CardContent className="p-6 text-center text-slate-700">
          <div className="text-lg font-semibold mb-2">Access Denied</div>
          <div>You need teacher or admin privileges to view student data.</div>
        </CardContent>
      </Card>
    );
  }

  if (!schoolId) {
    return (
      <Card className="max-w-xl mx-auto bg-white/95 border-slate-200">
        <CardContent className="p-6 text-center text-slate-700">
          <div className="text-lg font-semibold mb-2">School not linked</div>
          <div>Assign a school to this teacher account to see enrolled students.</div>
        </CardContent>
      </Card>
    );
  }

  if (progressError) {
    return (
      <Card className="max-w-xl mx-auto bg-white/95 border-slate-200">
        <CardContent className="p-6 text-center text-slate-700">
          <div className="text-lg font-semibold mb-2">Unable to load students</div>
          <div>{progressError}</div>
        </CardContent>
      </Card>
    );
  }

  const summary = {
    totalStudents: schoolProgress?.totalStudents ?? students.length,
    activeStudents: schoolProgress?.studentsWithActivity ?? 0,
    averageScore: clampPercent(schoolProgress?.schoolAverage ?? 0),
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-white/90 font-semibold text-2xl mb-4">Students</div>
      <Card className="bg-white/95 border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search students by name or class"
                  className="bg-white"
                />
                <select
                  value={selectedClass}
                  onChange={(event) => setSelectedClass(event.target.value)}
                  className="bg-white border rounded-md px-3 py-2 text-sm"
                >
                  {classOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 text-xs sm:text-sm text-slate-600">
                <div>Total Students <span className="font-semibold text-slate-800">{summary.totalStudents}</span></div>
                <div>Active <span className="font-semibold text-slate-800">{summary.activeStudents}</span></div>
                <div>Avg Score <span className="font-semibold text-emerald-600">{summary.averageScore}%</span></div>
              </div>
            </div>
            {progressLoading && !students.length ? (
              <div className="py-10 text-center text-slate-500">Loading students...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredStudents.length ? (
                  filteredStudents.map((student) => (
                    <StudentCard key={student.id} student={student} />
                  ))
                ) : (
                  <Card className="md:col-span-2 bg-white border-slate-200">
                    <CardContent className="p-6 text-center text-slate-600">
                      {students.length
                        ? "No students match that search."
                        : "No students found for this school yet."}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StudentsPage() {
  return (
    <>
      <SignedIn>
        <StudentsContent />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
