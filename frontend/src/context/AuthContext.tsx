import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { TOKEN_KEY, authApi } from '../lib/api';
import type { User } from '../types';
import { AuthContext } from './AuthContextInstance';

// ─── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  );
  // Derive initial loading: only true when a token already exists
  const hasStoredToken = Boolean(localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(hasStoredToken);

  // Prevent double-restoration in StrictMode
  const restored = useRef(false);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Listen for 401 events from Axios interceptor
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [logout]);

  // Restore session on mount — only runs if a token was found
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      // isLoading was initialised false when no token existed — nothing to do
      return;
    }

    authApi
      .me()
      .then(({ data }) => {
        setUser(data);
        setToken(storedToken);
      })
      .catch(() => {
        logout();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
