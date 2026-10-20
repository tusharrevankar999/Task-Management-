import axios from 'axios';

const TOKEN_KEY = 'auth_token';

// ─── Axios instance ─────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// ─── Request interceptor – attach Bearer token ──────────────────────────────

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor – handle 401 ─────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem(TOKEN_KEY);
      // Dispatch a custom event so AuthContext can react
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

// ─── Auth endpoints ─────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: import('../types').User }>('/auth/login', { email, password }),

  me: () =>
    api.get<import('../types').User>('/auth/me'),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }),

  resetPassword: (payload: { token: string; password: string }) =>
    api.post<{ message: string }>('/auth/reset-password', payload),
};

// ─── Users endpoints (admin) ────────────────────────────────────────────────

export const usersApi = {
  list: () =>
    api.get<import('../types').User[]>('/users'),

  create: (payload: import('../types').CreateUserPayload) =>
    api.post<import('../types').User>('/users', payload),

  update: (id: number | string, payload: import('../types').UpdateUserPayload) =>
    api.patch<import('../types').User>(`/users/${id}`, payload),

  deactivate: (id: number | string) =>
    api.patch<import('../types').User>(`/users/${id}`, { isActive: false }),

  delete: (id: number | string) =>
    api.delete(`/users/${id}`),
};

// ─── Projects endpoints ─────────────────────────────────────────────────────

export const projectsApi = {
  list: (params?: { search?: string; status?: string }) =>
    api.get<{ projects: import('../types').Project[] }>('/projects', { params }),

  get: (id: number | string) =>
    api.get<{ project: import('../types').Project }>(`/projects/${id}`),

  create: (payload: import('../types').CreateProjectPayload) =>
    api.post<{ project: import('../types').Project }>('/projects', payload),

  update: (id: number | string, payload: import('../types').UpdateProjectPayload) =>
    api.patch<{ project: import('../types').Project }>(`/projects/${id}`, payload),

  delete: (id: number | string) =>
    api.delete(`/projects/${id}`),
};

// ─── Tasks endpoints ────────────────────────────────────────────────────────

export const tasksApi = {
  listAll: (params?: { page?: number; limit?: number; search?: string; status?: string; projectId?: number }) =>
    api.get<{ data: import('../types').Task[]; pagination: import('../types').PaginationMeta }>('/tasks/all', { params }),

  list: (projectId: number | string) =>
    api.get<{ data: import('../types').Task[] }>(`/projects/${projectId}/tasks`),

  get: (projectId: number | string, taskId: number | string) =>
    api.get<{ data: import('../types').Task }>(`/projects/${projectId}/tasks/${taskId}`),

  create: (projectId: number | string, payload: import('../types').CreateTaskPayload) =>
    api.post<{ data: import('../types').Task }>(`/projects/${projectId}/tasks`, payload),

  update: (
    projectId: number | string,
    taskId: number | string,
    payload: import('../types').UpdateTaskPayload
  ) =>
    api.patch<{ data: import('../types').Task }>(`/projects/${projectId}/tasks/${taskId}`, payload),

  reorder: (taskIds: number[], projectId?: number | string) => {
    const url = projectId ? `/projects/${projectId}/tasks/reorder` : '/tasks/reorder';
    return api.put<{ success: boolean; count: number }>(url, { taskIds });
  },

  delete: (projectId: number | string, taskId: number | string) =>
    api.delete(`/projects/${projectId}/tasks/${taskId}`),
};

export { TOKEN_KEY };

// Notifications API
export const notificationsApi = {
  list: () => api.get<{ data: any[] }>('/notifications'),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
};
