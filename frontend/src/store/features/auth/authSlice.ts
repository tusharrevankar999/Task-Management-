import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { authApi, TOKEN_KEY } from '../../../lib/api';
import type { User, Role } from '../../../types';

export const normalizeUser = (u: any): User => ({
  ...u,
  role: (u.role?.toLowerCase?.() === 'admin' ? 'admin' : 'user') as Role,
});

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialToken = localStorage.getItem(TOKEN_KEY);

const initialState: AuthState = {
  user: null,
  token: initialToken,
  isLoading: Boolean(initialToken),
  error: null,
};

// Async thunk to restore current user from session token
export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const { data } = await authApi.me();
    return normalizeUser(data);
  } catch (err: any) {
    const message =
      err?.response?.data?.error?.message ??
      err?.response?.data?.message ??
      'Session expired. Please log in again.';
    return rejectWithValue(message);
  }
});

// Async thunk for login
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await authApi.login(email, password);
      localStorage.setItem(TOKEN_KEY, data.token);
      return {
        token: data.token,
        user: normalizeUser(data.user),
      };
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ??
        err?.response?.data?.message ??
        'Invalid email or password.';
      return rejectWithValue(message);
    }
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      localStorage.removeItem(TOKEN_KEY);
      state.user = null;
      state.token = null;
      state.isLoading = false;
      state.error = null;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchMe
    builder
      .addCase(fetchMe.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMe.fulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        localStorage.removeItem(TOKEN_KEY);
        state.user = null;
        state.token = null;
        state.isLoading = false;
        state.error = (action.payload as string) || 'Authentication failed';
      });

    // loginUser
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        loginUser.fulfilled,
        (state, action: PayloadAction<{ token: string; user: User }>) => {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.isLoading = false;
        }
      )
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Login failed';
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
