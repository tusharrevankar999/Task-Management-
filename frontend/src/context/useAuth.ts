import { useContext } from 'react';
import { AuthContext } from './AuthContextInstance';
import type { AuthContextValue } from '../types';

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
