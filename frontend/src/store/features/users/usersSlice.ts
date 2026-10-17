import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { usersApi } from '../../../lib/api';
import type { User, CreateUserPayload, UpdateUserPayload } from '../../../types';
import { normalizeUser } from '../auth/authSlice';

export interface UsersState {
  users: User[];
  isLoading: boolean;
  actionLoading: boolean;
  error: string | null;
}

const initialState: UsersState = {
  users: [],
  isLoading: false,
  actionLoading: false,
  error: null,
};

// Fetch all users
export const fetchUsers = createAsyncThunk('users/fetchUsers', async (_, { rejectWithValue }) => {
  try {
    const { data } = await usersApi.list();
    return Array.isArray(data) ? data.map(normalizeUser) : [];
  } catch (err: any) {
    const msg =
      err?.response?.data?.error?.message ??
      err?.response?.data?.message ??
      'Failed to load users.';
    return rejectWithValue(msg);
  }
});

// Create new user (admin)
export const createUser = createAsyncThunk(
  'users/createUser',
  async (payload: CreateUserPayload, { rejectWithValue }) => {
    try {
      const { data } = await usersApi.create(payload);
      return normalizeUser(data);
    } catch (err: any) {
      const respData = err?.response?.data;
      const detailsMsg = Array.isArray(respData?.error?.details)
        ? respData.error.details.map((d: any) => d.message).join(', ')
        : undefined;
      const msg =
        detailsMsg ??
        respData?.error?.message ??
        respData?.message ??
        'Failed to create user.';
      return rejectWithValue(msg);
    }
  }
);

// Update user (admin)
export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ id, payload }: { id: number | string; payload: UpdateUserPayload }, { rejectWithValue }) => {
    try {
      const { data } = await usersApi.update(id, payload);
      return normalizeUser(data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        err?.response?.data?.message ??
        'Failed to update user.';
      return rejectWithValue(msg);
    }
  }
);

// Delete user (admin)
export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async (id: number | string, { rejectWithValue }) => {
    try {
      await usersApi.delete(id);
      return id;
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        err?.response?.data?.message ??
        'Failed to delete user.';
      return rejectWithValue(msg);
    }
  }
);

export const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearUsersError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchUsers
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action: PayloadAction<User[]>) => {
        state.users = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Failed to fetch users';
      });

    // createUser
    builder
      .addCase(createUser.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.users.unshift(action.payload);
        state.actionLoading = false;
      })
      .addCase(createUser.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = (action.payload as string) || 'Failed to create user';
      });

    // updateUser
    builder
      .addCase(updateUser.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action: PayloadAction<User>) => {
        const index = state.users.findIndex((u) => u.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
        state.actionLoading = false;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = (action.payload as string) || 'Failed to update user';
      });

    // deleteUser
    builder
      .addCase(deleteUser.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action: PayloadAction<number | string>) => {
        state.users = state.users.filter((u) => u.id !== Number(action.payload));
        state.actionLoading = false;
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = (action.payload as string) || 'Failed to delete user';
      });
  },
});

export const { clearUsersError } = usersSlice.actions;
export default usersSlice.reducer;
