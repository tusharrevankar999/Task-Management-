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

  update: (id: string, payload: import('../types').UpdateUserPayload) =>
    api.patch<import('../types').User>(`/users/${id}`, payload),

  deactivate: (id: string) =>
    api.patch<import('../types').User>(`/users/${id}`, { isActive: false }),

  delete: (id: string) =>
    api.delete(`/users/${id}`),
};

export { TOKEN_KEY };
