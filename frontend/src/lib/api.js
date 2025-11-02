// API client for the learning dashboard
const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.trim();
const API_BASE_URL = (RAW_API_BASE_URL && RAW_API_BASE_URL.length
  ? RAW_API_BASE_URL.replace(/\/$/, '')
  : '/api');

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
  const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body !== 'string') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let detail = '';
        try {
          const data = await response.json();
          detail = data?.error || data?.message || JSON.stringify(data).slice(0, 200);
        } catch (e) {
          try {
            detail = (await response.text()).slice(0, 200);
          } catch (e2) {
            // ignore
          }
        }

        // If we couldn't extract a useful body, fall back to statusText or a status string
        if (!detail) {
          detail = response.statusText || `Status ${response.status}`;
        }

        // Include the full request url in error messages to help debugging
        const urlInfo = ` [url: ${url}]`;
        if (response.status === 503) {
          throw new Error(`Service unavailable (${response.status}): ${detail}${urlInfo}`);
        }
        if (response.status >= 500) {
          throw new Error(`Server error (${response.status}): ${detail}${urlInfo}`);
        }
        if (response.status === 404) {
          throw new Error(`Not found (${response.status}): ${detail}${urlInfo}`);
        }
        throw new Error(`HTTP ${response.status}: ${detail}${urlInfo}`);
      }

      return await response.json();
    } catch (error) {
  console.error(`API request failed: ${endpoint} (url: ${url})`, error);
      
      // Handle network errors (API not reachable)
      if (error.message === 'Failed to fetch' || error.message.includes('fetch') || error.code === 'ECONNREFUSED') {
        throw new Error(`API is not reachable (tried ${url}). Ensure the Next.js server or backend is running and exposes its /api routes.`);
      }
      
      // Handle timeout errors
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please check your connection.');
      }
      
      throw error;
    }
  }

  // Health check method (tolerant of backend downtime)
  async healthCheck() {
    const url = `${this.baseURL}/health`;
    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch (parseError) {
        payload = {};
      }

      if (response.ok) {
        return {
          ok: true,
          status: response.status,
          payload,
        };
      }

      return {
        ok: false,
        status: response.status,
        payload,
        error:
          payload?.error ||
          payload?.message ||
          response.statusText ||
          `Health check failed with status ${response.status}`,
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        error: error?.message || 'Unable to reach backend health endpoint.',
      };
    }
  }

  // ===========================================
  // SUBJECTS API
  // ===========================================

  async getSubjects(filter = {}) {
    const params = new URLSearchParams();
    if (typeof filter === 'string') {
      params.append('class', filter);
    } else if (filter && typeof filter === 'object') {
      if (filter.classFilter) params.append('class', filter.classFilter);
      if (filter.class) params.append('class', filter.class);
      if (filter.schoolId) params.append('schoolId', filter.schoolId);
    }
    const queryString = params.toString();
    return this.request(`/subjects${queryString ? '?' + queryString : ''}`);
  }

  async createSubject(subjectData) {
    return this.request('/subjects', {
      method: 'POST',
      body: subjectData,
    });
  }

  async updateSubject(id, subjectData) {
    return this.request(`/subjects/${id}`, {
      method: 'PUT',
      body: subjectData,
    });
  }

  async deleteSubject(id, deletedBy) {
    return this.request(`/subjects/${id}`, {
      method: 'DELETE',
      body: { deletedBy },
    });
  }

  // ===========================================
  // QUIZZES API
  // ===========================================

  async getQuizzes(filters = {}) {
    const params = new URLSearchParams();
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (filters.createdBy) params.append('createdBy', filters.createdBy);
    if (filters.schoolId) params.append('schoolId', filters.schoolId);
    
    const queryString = params.toString();
    return this.request(`/quizzes${queryString ? '?' + queryString : ''}`);
  }

  async getQuiz(id, includeAnswers = false) {
    const params = includeAnswers ? '?includeAnswers=true' : '';
    return this.request(`/quizzes/${id}${params}`);
  }

  async createQuiz(quizData) {
    return this.request('/quizzes', {
      method: 'POST',
      body: quizData,
    });
  }

  async getQuizQuestions(params = {}) {
    const query = new URLSearchParams();
    if (params.quizId) query.append('quizId', params.quizId);
    if (params.schoolId) query.append('schoolId', params.schoolId);
    if (params.includeAnswers === true) query.append('includeAnswers', 'true');
    if (params.limit) query.append('limit', String(params.limit));
    const queryString = query.toString();
    return this.request(`/questions${queryString ? '?' + queryString : ''}`);
  }

  async createQuestion(questionData) {
    return this.request('/questions', {
      method: 'POST',
      body: questionData,
    });
  }

  async updateQuestion(id, questionData) {
    return this.request(`/questions/${id}`, {
      method: 'PUT',
      body: questionData,
    });
  }

  async deleteQuestion(id, deletedBy) {
    const params = new URLSearchParams({ deletedBy });
    return this.request(`/questions/${id}?${params.toString()}`, {
      method: 'DELETE',
    });
  }

  // ===========================================
  // QUIZ RESPONSES API
  // ===========================================

  async submitQuizResponse(responseData) {
    return this.request('/responses', {
      method: 'POST',
      body: responseData,
    });
  }

  async getStudentResponses(studentId, limit = 50) {
    return this.request(`/responses/student/${studentId}?limit=${limit}`);
  }

  // ===========================================
  // STREAK AND PROGRESS API
  // ===========================================

  async getStreak(userId) {
    return this.request(`/streak/${userId}`);
  }

  async getDailyActivity(userId, date = null) {
    const params = date ? `?date=${date}` : '';
    return this.request(`/daily-activity/${userId}${params}`);
  }

  async getQuizHistory(userId, limit = 50, startDate = null, endDate = null) {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    return this.request(`/quiz-history/${userId}?${params.toString()}`);
  }

  async recordQuizCompletion(completionData) {
    return this.request('/quiz-completion', {
      method: 'POST',
      body: completionData,
    });
  }

  // ===========================================
  // ACHIEVEMENTS API
  // ===========================================
  async getAchievements(userId) {
    return this.request(`/achievements/${userId}`);
  }

  async upsertAchievement(data) {
    return this.request('/achievements', { method: 'POST', body: data });
  }

  // ===========================================
  // LEADERBOARD API
  // ===========================================

  async getLeaderboard(filters = {}) {
    const params = new URLSearchParams();
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (filters.timeframe) params.append('timeframe', filters.timeframe);
    
    const queryString = params.toString();
    return this.request(`/leaderboard${queryString ? '?' + queryString : ''}`);
  }

  // ===========================================
  // AI STUDY BUDDY
  // ===========================================
  async askStudyBuddy({ question, mode = 'answer', history = [] }) {
    try {
      return await this.request('/ai/study-buddy', {
        method: 'POST',
        body: { question, mode, history }
      });
    } catch (e) {
      console.error('askStudyBuddy failed', e);
      throw e;
    }
  }

  // ===========================================
  // USER MANAGEMENT API
  // ===========================================

  async getUserRole(userId) {
    return this.request(`/users/${userId}/role`);
  }

  async setUserRole(roleData) {
    return this.request('/users/role', {
      method: 'POST',
      body: roleData,
    });
  }

  // ===========================================
  // SETUP AND MAINTENANCE
  // ===========================================

  async setupViews() {
    return this.request('/setup-views', {
      method: 'POST',
    });
  }

  // ===========================================
  // STUDENT PROGRESS API
  // ===========================================

  async getStudentsBySchool(schoolId) {
    return this.request(`/students/school/${schoolId}`);
  }

  async getStudentProgress(studentId, limit = 50) {
    return this.request(`/students/${studentId}/progress?limit=${limit}`);
  }

  async getSchoolProgress(schoolId) {
    return this.request(`/progress/school/${schoolId}`);
  }

  // ===========================================
  // SCHOOL CONTENT API
  // ===========================================

  async getSchoolContent(schoolId, options = {}) {
    if (!schoolId) {
      throw new Error('schoolId is required to load content');
    }
    const params = new URLSearchParams({ schoolId });
    if (options.type) {
      params.append('type', options.type);
    }
    if (options.limit) {
      params.append('limit', String(options.limit));
    }
    const queryString = params.toString();
    return this.request(`/content?${queryString}`);
  }

  async createContentItem(contentData) {
    return this.request('/content', {
      method: 'POST',
      body: contentData,
    });
  }

  async updateContentItem(id, contentData) {
    return this.request(`/content/${id}`, {
      method: 'PUT',
      body: contentData,
    });
  }

  async deleteContentItem(id, deletedBy) {
    const params = new URLSearchParams();
    if (deletedBy) params.append('deletedBy', deletedBy);
    const suffix = params.toString();
    return this.request(`/content/${id}${suffix ? `?${suffix}` : ''}`, {
      method: 'DELETE',
    });
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;

// Named exports (bind methods so 'this' is preserved if destructured)
export const getSubjects = apiClient.getSubjects.bind(apiClient);
export const createSubject = apiClient.createSubject.bind(apiClient);
export const updateSubject = apiClient.updateSubject.bind(apiClient);
export const deleteSubject = apiClient.deleteSubject.bind(apiClient);
export const getQuizzes = apiClient.getQuizzes.bind(apiClient);
export const getQuiz = apiClient.getQuiz.bind(apiClient);
export const createQuiz = apiClient.createQuiz.bind(apiClient);
export const getQuizQuestions = apiClient.getQuizQuestions.bind(apiClient);
export const createQuestion = apiClient.createQuestion.bind(apiClient);
export const updateQuestion = apiClient.updateQuestion.bind(apiClient);
export const deleteQuestion = apiClient.deleteQuestion.bind(apiClient);
export const submitQuizResponse = apiClient.submitQuizResponse.bind(apiClient);
export const getStudentResponses = apiClient.getStudentResponses.bind(apiClient);
export const getStreak = apiClient.getStreak.bind(apiClient);
export const getDailyActivity = apiClient.getDailyActivity.bind(apiClient);
export const getQuizHistory = apiClient.getQuizHistory.bind(apiClient);
export const recordQuizCompletion = apiClient.recordQuizCompletion.bind(apiClient);
export const getLeaderboard = apiClient.getLeaderboard.bind(apiClient);
export const askStudyBuddy = apiClient.askStudyBuddy.bind(apiClient);
export const getUserRole = apiClient.getUserRole.bind(apiClient);
export const setUserRole = apiClient.setUserRole.bind(apiClient);
export const setupViews = apiClient.setupViews.bind(apiClient);
export const getStudentsBySchool = apiClient.getStudentsBySchool.bind(apiClient);
export const getStudentProgress = apiClient.getStudentProgress.bind(apiClient);
export const getSchoolProgress = apiClient.getSchoolProgress.bind(apiClient);
export const getSchoolContent = apiClient.getSchoolContent.bind(apiClient);
export const createContentItem = apiClient.createContentItem.bind(apiClient);
export const updateContentItem = apiClient.updateContentItem.bind(apiClient);
export const deleteContentItem = apiClient.deleteContentItem.bind(apiClient);
