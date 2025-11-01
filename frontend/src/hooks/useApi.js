import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api';

// Custom hook for subjects data
export function useSubjects(options = {}) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const normalized = typeof options === 'string' ? { classFilter: options } : options || {};
  const { classFilter = null, schoolId = null } = normalized;

  const fetchSubjects = useCallback(async () => {
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
  }, [classFilter, schoolId]);

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStudents = useCallback(async () => {
    if (!schoolId) return;
    
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
