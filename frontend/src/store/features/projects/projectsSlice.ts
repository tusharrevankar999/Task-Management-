import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { projectsApi } from '../../../lib/api';
import type { CreateProjectPayload, Project, UpdateProjectPayload } from '../../../types';

interface ProjectsState {
  items: Project[];
  isLoading: boolean;
  error: string | null;
  activeFilter: 'all' | 'active' | 'archived';
  searchQuery: string;
}

const initialState: ProjectsState = {
  items: [],
  isLoading: false,
  error: null,
  activeFilter: 'active',
  searchQuery: '',
};

export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (params: { search?: string; status?: string } | undefined, { rejectWithValue }) => {
    try {
      const { data } = await projectsApi.list(params);
      return data.projects;
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        err?.response?.data?.message ??
        'Failed to fetch projects.';
      return rejectWithValue(msg);
    }
  }
);

export const createProject = createAsyncThunk(
  'projects/createProject',
  async (payload: CreateProjectPayload, { rejectWithValue }) => {
    try {
      const { data } = await projectsApi.create(payload);
      return data.project;
    } catch (err: any) {
      const respData = err?.response?.data;
      const detailsMsg = Array.isArray(respData?.error?.details)
        ? respData.error.details.map((d: any) => d.message).join(', ')
        : undefined;
      const msg =
        detailsMsg ??
        respData?.error?.message ??
        respData?.message ??
        'Failed to create project.';
      return rejectWithValue(msg);
    }
  }
);

export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ id, payload }: { id: number | string; payload: UpdateProjectPayload }, { rejectWithValue }) => {
    try {
      const { data } = await projectsApi.update(id, payload);
      return data.project;
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        err?.response?.data?.message ??
        'Failed to update project.';
      return rejectWithValue(msg);
    }
  }
);

export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (id: number | string, { rejectWithValue }) => {
    try {
      await projectsApi.delete(id);
      return id;
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        err?.response?.data?.message ??
        'Failed to delete project.';
      return rejectWithValue(msg);
    }
  }
);

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setActiveFilter: (state, action: PayloadAction<'all' | 'active' | 'archived'>) => {
      state.activeFilter = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchProjects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create
      .addCase(createProject.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      // Update
      .addCase(updateProject.fulfilled, (state, action) => {
        const index = state.items.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Delete
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.items = state.items.filter((p) => p.id !== action.payload);
      });
  },
});

export const { setActiveFilter, setSearchQuery } = projectsSlice.actions;
export default projectsSlice.reducer;
