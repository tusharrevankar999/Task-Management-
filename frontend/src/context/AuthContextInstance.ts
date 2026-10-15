import { createContext } from 'react';
import type { AuthContextValue } from '../types';

// Exported so AuthProvider can provide it and useAuth can consume it
export const AuthContext = createContext<AuthContextValue | null>(null);
