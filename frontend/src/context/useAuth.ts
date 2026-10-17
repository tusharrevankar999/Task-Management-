import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginUser, logout as logoutAction, fetchMe } from '../store/features/auth/authSlice';
import type { AuthContextValue } from '../types';

export function useAuth(): AuthContextValue {
  const dispatch = useAppDispatch();
  const { user, token, isLoading } = useAppSelector((state) => state.auth);

  // Restore session once on mount if token exists and user is not yet loaded
  useEffect(() => {
    if (token && !user) {
      dispatch(fetchMe());
    }
  }, [dispatch, token, user]);

  const login = useCallback(
    async (email: string, password: string) => {
      const resultAction = await dispatch(loginUser({ email, password }));
      if (loginUser.rejected.match(resultAction)) {
        throw new Error(resultAction.payload as string);
      }
    },
    [dispatch]
  );

  const logout = useCallback(() => {
    dispatch(logoutAction());
  }, [dispatch]);

  return {
    user,
    token,
    isLoading,
    login,
    logout,
  };
}
