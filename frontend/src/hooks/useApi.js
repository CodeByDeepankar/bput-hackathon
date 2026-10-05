import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api';
import { saveLocalLessonProgress, getLocalProgressMap } from '@/lib/offlineDb';
import { initSyncEngine, processSyncQueue } from '@/lib/syncEngine';

// Custom hook for subjects data
export function useSubjects(options = {}) {
  const normalized = typeof options === 'string' ? { classFilter: options } : options || {};
  const { classFilter = null, schoolId = null, enabled = true } = normalized;

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  const fetchSubjects = useCallback(async () => {
    if (!enabled) {
      setSubjects([]);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getSubjects({ classFilter, schoolId });
      setSubjects(data);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
      setError(err.message);
      // Fallback to empty array if backend is not available
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [classFilter, schoolId, enabled]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const createSubject = useCallback(async (subjectData) => {
    try {
      const result = await apiClient.createSubject(subjectData);
      await fetchSubjects(); // Refresh the list
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchSubjects]);

  const updateSubject = useCallback(async (id, subjectData) => {
    try {
      const result = await apiClient.updateSubject(id, subjectData);
      await fetchSubjects(); // Refresh the list
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchSubjects]);

  const deleteSubject = useCallback(async (id, deletedBy) => {
    try {
      const result = await apiClient.deleteSubject(id, deletedBy);
      await fetchSubjects(); // Refresh the list
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchSubjects]);

  return {
    subjects,
    loading,
    error,
    fetchSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
  };
}

// Custom hook for quizzes data
export function useQuizzes(filters = {}) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { subjectId, createdBy, schoolId } = filters;

  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getQuizzes({ subjectId, createdBy, schoolId });
      setQuizzes(data);
    } catch (err) {
      console.error('Failed to fetch quizzes:', err);
      setError(err.message);
      // Fallback to empty array if backend is not available
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }, [subjectId, createdBy, schoolId]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const createQuiz = useCallback(async (quizData) => {
    try {
      const result = await apiClient.createQuiz(quizData);
      await fetchQuizzes(); // Refresh the list
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchQuizzes]);

  return {
    quizzes,
    loading,
    error,
    fetchQuizzes,
    createQuiz,
  };
}

export function useQuizQuestions(params = {}) {
  const { quizId, schoolId, includeAnswers = false } = params;
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(Boolean(quizId || schoolId));
  const [error, setError] = useState(null);

  const fetchQuestions = useCallback(async () => {
    if (!quizId && !schoolId) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getQuizQuestions({ quizId, schoolId, includeAnswers });
      setQuestions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
      setError(err.message);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [quizId, schoolId, includeAnswers]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const addQuestion = useCallback(async (payload) => {
    try {
      const result = await apiClient.createQuestion(payload);
      await fetchQuestions();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchQuestions]);

  const updateQuestion = useCallback(async (id, payload) => {
    try {
      const result = await apiClient.updateQuestion(id, payload);
      await fetchQuestions();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchQuestions]);

  const removeQuestion = useCallback(async (id, deletedBy) => {
    try {
      const result = await apiClient.deleteQuestion(id, deletedBy);
      await fetchQuestions();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchQuestions]);

  return {
    questions,
    loading,
    error,
    fetchQuestions,
    addQuestion,
    updateQuestion,
    removeQuestion,
  };
}

// Custom hook for a single quiz with questions
export function useQuiz(quizId, includeAnswers = false) {
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQuiz = useCallback(async () => {
    if (!quizId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getQuiz(quizId, includeAnswers);
      setQuiz(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [quizId, includeAnswers]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  return {
    quiz,
    loading,
    error,
    fetchQuiz,
  };
}

// Custom hook for quiz responses and submissions
export function useQuizResponses(studentId) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchResponses = useCallback(async () => {
    if (!studentId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getStudentResponses(studentId);
      setResponses(data.responses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  const submitResponse = useCallback(async (responseData) => {
    try {
      const result = await apiClient.submitQuizResponse(responseData);
      await fetchResponses(); // Refresh responses
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchResponses]);

  return {
    responses,
    loading,
    error,
    fetchResponses,
    submitResponse,
  };
}

// Custom hook for daily activity and progress
export function useDailyActivity(userId, date = null) {
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchActivity = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getDailyActivity(userId, date);
      setActivity(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, date]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return {
    activity,
    loading,
    error,
    fetchActivity,
  };
}

// Custom hook for leaderboard data
export function useLeaderboard(filters = {}) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { subjectId, timeframe } = filters;

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getLeaderboard({ subjectId, timeframe });
      setLeaderboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [subjectId, timeframe]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    leaderboard,
    loading,
    error,
    fetchLeaderboard,
  };
}

// Custom hook for user role management
export function useUserRole(userId) {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserRole = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getUserRole(userId);
      setUserRole(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  const setRole = useCallback(async (roleData) => {
    try {
      const result = await apiClient.setUserRole(roleData);
      await fetchUserRole(); // Refresh user data
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchUserRole]);

  return {
    userRole,
    loading,
    error,
    fetchUserRole,
    setRole,
  };
}

// Custom hook for student progress data
export function useStudentProgress(studentId) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProgress = useCallback(async () => {
    if (!studentId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getStudentProgress(studentId);
      setProgress(data);
    } catch (err) {
      console.error('Failed to fetch student progress:', err);
      setError(err.message);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    progress,
    loading,
    error,
    fetchProgress,
  };
}

// Custom hook for school progress data
export function useSchoolProgress(schoolId) {
  const [schoolProgress, setSchoolProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSchoolProgress = useCallback(async () => {
    if (!schoolId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getSchoolProgress(schoolId);
      setSchoolProgress(data);
    } catch (err) {
      console.error('Failed to fetch school progress:', err);
      setError(err.message);
      setSchoolProgress(null);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchSchoolProgress();
  }, [fetchSchoolProgress]);

  return {
    schoolProgress,
    loading,
    error,
    fetchSchoolProgress,
  };
}

// Custom hook for students in a school
export function useStudentsBySchool(schoolId) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(Boolean(schoolId));
  const [error, setError] = useState(null);

  const fetchStudents = useCallback(async () => {
    if (!schoolId) {
      setStudents([]);
      setError(null);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getStudentsBySchool(schoolId);
      setStudents(data);
    } catch (err) {
      console.error('Failed to fetch students:', err);
      setError(err.message);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return {
    students,
    loading,
    error,
    fetchStudents,
  };
}

// Custom hook for school-specific shared content
export function useSchoolContent(schoolId, options = {}) {
  const { type = null, limit = null } = options;
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(Boolean(schoolId));
  const [error, setError] = useState(null);

  const fetchContent = useCallback(async () => {
    if (!schoolId) {
      setContent([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getSchoolContent(schoolId, { type, limit });
      setContent(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch school content:', err);
      setError(err.message);
      setContent([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId, type, limit]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const createContent = useCallback(async (contentPayload) => {
    try {
      const result = await apiClient.createContentItem(contentPayload);
      await fetchContent();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchContent]);

  const updateContent = useCallback(async (id, contentPayload) => {
    try {
      const result = await apiClient.updateContentItem(id, contentPayload);
      await fetchContent();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchContent]);

  const deleteContent = useCallback(async (id, deletedBy) => {
    try {
      const result = await apiClient.deleteContentItem(id, deletedBy);
      await fetchContent();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchContent]);

  return {
    content,
    loading,
    error,
    fetchContent,
    createContent,
    updateContent,
    deleteContent,
  };
}

// Custom hook for consolidated student dashboard data
export function useStudentDashboard(studentId) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(Boolean(studentId));
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    if (!studentId) {
      setDashboardData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getStudentDashboard(studentId);
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to fetch student dashboard:', err);
      setError(err.message);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    dashboardData,
    loading,
    error,
    fetchDashboard,
  };
}

// Custom hook for teacher learning modules management
export function useTeacherModules(filters = {}) {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { class: classFilter, subjectId } = filters;

  const fetchModules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getTeacherModules({ class: classFilter, subjectId });
      setModules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch teacher modules:', err);
      setError(err.message);
      setModules([]);
    } finally {
      setLoading(false);
    }
  }, [classFilter, subjectId]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const createModule = useCallback(async (moduleData) => {
    try {
      const result = await apiClient.createLearningModule(moduleData);
      await fetchModules();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchModules]);

  const updateModule = useCallback(async (id, moduleData) => {
    try {
      const result = await apiClient.updateLearningModule(id, moduleData);
      await fetchModules();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchModules]);

  const deleteModule = useCallback(async (id) => {
    try {
      const result = await apiClient.deleteLearningModule(id);
      await fetchModules();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchModules]);

  return {
    modules,
    loading,
    error,
    fetchModules,
    createModule,
    updateModule,
    deleteModule,
  };
}

// Custom hook for student learning modules & progress (Offline-First with Dexie IDB & Sync Engine)
export function useStudentModules(options = {}) {
  const { enabled = true } = options;
  const [data, setData] = useState({ modules: [], studentClass: null, schoolId: null });
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  const fetchModules = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);

      // Read local IndexedDB progress map
      let localMap = {};
      try {
        localMap = await getLocalProgressMap();
      } catch (e) {
        console.warn('Failed to read local IndexedDB map:', e);
      }

      let serverRes = null;
      try {
        serverRes = await apiClient.getStudentModules();
      } catch (err) {
        console.warn('Network offline or error fetching server modules:', err.message);
      }

      const rawModules = serverRes?.modules || [];

      // Merge server modules with local IndexedDB progress overrides
      const mergedModules = rawModules.map((mod) => {
        const lessons = (mod.lessons || []).map((les) => {
          const localItem = localMap[les.id];
          const isCompleted = localItem ? Boolean(localItem.completed) : Boolean(les.progress?.completed);
          const isPendingSync = localItem?.syncStatus === "pending";

          return {
            ...les,
            progress: {
              completed: isCompleted,
              lastPosition: localItem?.lastPosition || les.progress?.lastPosition || 0,
              completedAt: localItem?.completedAt || les.progress?.completedAt || null,
              syncStatus: isPendingSync ? "pending" : (les.progress?.syncStatus || "synced"),
            },
          };
        });

        const totalLessons = lessons.length;
        const completedLessons = lessons.filter((l) => l.progress.completed).length;

        return {
          ...mod,
          lessons,
          stats: {
            totalLessons,
            completedLessons,
            isCompleted: totalLessons > 0 && completedLessons === totalLessons,
          },
        };
      });

      setData({
        modules: mergedModules,
        studentClass: serverRes?.studentClass || null,
        schoolId: serverRes?.schoolId || null,
      });
    } catch (err) {
      setError(err.message || 'Failed to load learning modules');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchModules();
    initSyncEngine(() => fetchModules());
  }, [fetchModules]);

  const markLessonProgress = useCallback(async (lessonId, completed = true, lastPosition = 0, action = "complete") => {
    try {
      // 1. Save to local IndexedDB first
      await saveLocalLessonProgress({ lessonId, completed, lastPosition, action });

      // 2. Immediate UI state refresh
      await fetchModules();

      // 3. Process sync queue if online
      if (typeof navigator !== "undefined" && navigator.onLine) {
        processSyncQueue().then(() => fetchModules());
      }

      return { success: true };
    } catch (err) {
      console.error('Failed to update offline lesson progress:', err);
      throw err;
    }
  }, [fetchModules]);

  return {
    modules: data.modules,
    studentClass: data.studentClass,
    schoolId: data.schoolId,
    loading,
    error,
    refetch: fetchModules,
    markLessonProgress,
  };
}

// Custom hook for teacher to fetch live student lesson progress reports
export function useTeacherStudentProgress(options = {}) {
  const { enabled = true } = options;
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.getTeacherStudentProgress();
      setReports(res?.progressReports || []);
    } catch (err) {
      setError(err.message || 'Failed to load student progress reports');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    reports,
    loading,
    error,
    refetch: fetchReports,
  };
}




