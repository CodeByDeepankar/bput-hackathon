import { useEffect } from "react";
import { subscribeToEvent } from "@/lib/realtime";

/**
 * Listen for realtime quiz progress events and invoke the callback when
 * the incoming payload matches the current student or school context.
 */
export function useRealtimeQuizProgress({ studentId = null, schoolId = null, onQuizEvent }) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    if (!studentId && !schoolId) {
      return undefined;
    }

    const unsubscribe = subscribeToEvent("quiz.progress", (payload) => {
      if (!payload) return;

      const eventStudentId = payload.userId || payload.studentId || null;
      const eventSchoolId = payload.schoolId || null;

      if (studentId && eventStudentId !== studentId) {
        return;
      }

      if (schoolId && eventSchoolId !== schoolId) {
        return;
      }

      if (typeof onQuizEvent === "function") {
        onQuizEvent(payload);
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [studentId, schoolId, onQuizEvent]);
}
