"use client";
import { use, useEffect, useMemo, useState } from "react";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/nextjs";
import { Card, CardContent } from "@teacher/components/ui/card";
import { fetchUserRole } from "@/lib/users";
import { useStudentsBySchool } from "@/hooks/useApi";
import StudentReportView from "@/components/reports/StudentReportView";

function TeacherGuard({ children }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const [roleDoc, setRoleDoc] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user?.id) {
      setRoleDoc(null);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    fetchUserRole(user.id)
      .then((doc) => {
        if (!active) return;
        setRoleDoc(doc);
      })
      .catch((err) => {
        if (!active) return;
        setRoleDoc(null);
        setError(err?.message || "Unable to verify role");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, user?.id]);

  if (!isSignedIn) {
    return null;
  }

  if (loading) {
    return (
      <Card className="max-w-xl mx-auto bg-white/95 border-slate-200">
        <CardContent className="p-6 text-center text-slate-700">
          Checking teacher access...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="max-w-xl mx-auto bg-white/95 border-slate-200">
        <CardContent className="p-6 text-center text-slate-700">
          <div className="text-lg font-semibold mb-2">Unable to load teacher role</div>
          <div>{error}</div>
        </CardContent>
      </Card>
    );
  }

  const role = typeof roleDoc === "string" ? roleDoc : roleDoc?.role;
  if (!role || !["teacher", "admin"].includes(role)) {
    return (
      <Card className="max-w-xl mx-auto bg-white/95 border-slate-200">
        <CardContent className="p-6 text-center text-slate-700">
          <div className="text-lg font-semibold mb-2">Access denied</div>
          <div>You need teacher or admin privileges to view individual student reports.</div>
        </CardContent>
      </Card>
    );
  }

  return typeof children === "function" ? children({ roleDoc }) : children;
}

function TeacherStudentReportInner({ studentId, roleDoc }) {
  const roleData = roleDoc && typeof roleDoc === "object" ? roleDoc : {};
  const schoolId = roleData.schoolId || roleData.school_id || null;
  const { students, error: rosterError } = useStudentsBySchool(schoolId);
  const candidateStudents = useMemo(
    () => (Array.isArray(students) ? students : []),
    [students],
  );
  const noSchool = !schoolId;

  if (!studentId) {
    return (
      <Card className="max-w-xl mx-auto bg-white/95 border-slate-200">
        <CardContent className="p-6 text-center text-slate-700">
          <div className="text-lg font-semibold mb-2">Student not found</div>
          <div>We could not resolve the requested student. Please return to the student list.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {noSchool ? (
        <Card className="max-w-5xl mx-auto mb-4 bg-white/95 border-slate-200">
          <CardContent className="p-4 text-sm text-slate-700">
            This teacher account is missing a school assignment, so student names may appear as their IDs.
          </CardContent>
        </Card>
      ) : null}
      {rosterError ? (
        <Card className="max-w-5xl mx-auto mb-4 bg-white/95 border-slate-200">
          <CardContent className="p-4 text-sm text-red-600">
            Unable to load the student roster. Report data may be missing names.
          </CardContent>
        </Card>
      ) : null}
      <StudentReportView
        studentId={studentId}
        backHref="/teacher/students"
        title="Student Performance"
        candidateStudents={candidateStudents}
      />
    </>
  );
}

export default function TeacherStudentReportPage({ params }) {
  const resolvedParams = use(params);
  const studentId = resolvedParams?.studentId;

  return (
    <>
      <SignedIn>
        <TeacherGuard>
          {({ roleDoc }) => (
            <TeacherStudentReportInner studentId={studentId} roleDoc={roleDoc} />
          )}
        </TeacherGuard>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
