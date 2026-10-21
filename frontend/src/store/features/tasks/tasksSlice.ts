import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { tasksApi } from '../../../lib/api';
import type { CreateTaskPayload, PaginationMeta, Task, UpdateTaskPayload } from '../../../types';

interface TasksState {
  allTasks: Task[];
  pagination: PaginationMeta;
  tasksByProject: Record<number, Task[]>;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isReordering: boolean;
  error: string | null;
}

const initialState: TasksState = {
  allTasks: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  },
  tasksByProject: {},
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isReordering: false,
  error: null,
};

export const fetchAllTasks = createAsyncThunk(
  'tasks/fetchAllTasks',
  async (
    params:
      | {
          page?: number;
          limit?: number;
          search?: string;
          status?: string;
          priority?: string;
          dueDate?: string;
          sortBy?: string;
          sortOrder?: 'asc' | 'desc';
          projectId?: number;
        }
      | undefined,
    { rejectWithValue }
  ) => {
    try {
      const { data } = await tasksApi.listAll(params);
      return data;
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        err?.response?.data?.message ??
        'Failed to fetch tasks.';
      return rejectWithValue(msg);
    }
  }
);

export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (projectId: number, { rejectWithValue }) => {
    try {
      const { data } = await tasksApi.list(projectId);
      return { projectId, tasks: data.data };
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        err?.response?.data?.message ??
        'Failed to fetch tasks.';
      return rejectWithValue(msg);
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (
    { projectId, payload }: { projectId: number; payload: CreateTaskPayload },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await tasksApi.create(projectId, payload);
      return { projectId, task: data.data };
    } catch (err: any) {
      const respData = err?.response?.data;
      const detailsMsg = Array.isArray(respData?.error?.details)
        ? respData.error.details.map((d: any) => d.message).join(', ')
        : undefined;
      const msg =
        detailsMsg ??
        respData?.error?.message ??
        respData?.message ??
        'Failed to create task.';
      return rejectWithValue(msg);
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async (
    {
      projectId,
      taskId,
      payload,
    }: {
      projectId: number;
      taskId: number;
      payload: UpdateTaskPayload;
    },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await tasksApi.update(projectId, taskId, payload);
      return { projectId, task: data.data };
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        err?.response?.data?.message ??
        'Failed to update task.';
      return rejectWithValue(msg);
    }
  }
);

export const reorderTasks = createAsyncThunk(
  'tasks/reorderTasks',
  async (
    { taskIds, projectId }: { taskIds: number[]; projectId?: number },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await tasksApi.reorder(taskIds, projectId);
      return data;
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        err?.response?.data?.message ??
        'Failed to reorder tasks.';
      return rejectWithValue(msg);
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (
    { projectId, taskId }: { projectId: number; taskId: number },
    { rejectWithValue }
  ) => {
    try {
      await tasksApi.delete(projectId, taskId);
      return { projectId, taskId };
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        err?.response?.data?.message ??
        'Failed to delete task.';
      return rejectWithValue(msg);
    }
  }
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    clearTasksError: (state) => {
      state.error = null;
    },
    setAllTasksOrder: (state, action: PayloadAction<Task[]>) => {
      state.allTasks = action.payload;
    },
    // Real-time Socket Event Handlers
    onTaskCreatedOrAssigned: (state, action: PayloadAction<Task>) => {
      const task = action.payload;
      const exists = state.allTasks.some((t) => t.id === task.id);
      if (!exists) {
        state.allTasks = [task, ...state.allTasks];
        state.pagination.total += 1;
      }
      if (task.projectId) {
        const list = state.tasksByProject[task.projectId];
        if (list && !list.some((t) => t.id === task.id)) {
          state.tasksByProject[task.projectId] = [task, ...list];
        }
      }
    },
    onTaskUpdated: (state, action: PayloadAction<Task>) => {
      const task = action.payload;
      const allIdx = state.allTasks.findIndex((t) => t.id === task.id);
      if (allIdx !== -1) {
        state.allTasks[allIdx] = { ...state.allTasks[allIdx], ...task };
      }
      if (task.projectId) {
        const list = state.tasksByProject[task.projectId];
        if (list) {
          const index = list.findIndex((t) => t.id === task.id);
          if (index !== -1) {
            list[index] = { ...list[index], ...task };
          }
        }
      }
    },
    onTaskDeleted: (state, action: PayloadAction<{ taskId: number; projectId?: number }>) => {
      const { taskId, projectId } = action.payload;
      state.allTasks = state.allTasks.filter((t) => t.id !== taskId);
      state.pagination.total = Math.max(0, state.pagination.total - 1);
      if (projectId && state.tasksByProject[projectId]) {
        state.tasksByProject[projectId] = state.tasksByProject[projectId].filter(
          (t) => t.id !== taskId
        );
      }
    },
    onTasksReordered: (state, action: PayloadAction<{ taskIds: number[]; projectId?: number }>) => {
      const { taskIds } = action.payload;
      if (taskIds && taskIds.length > 0) {
        const idToPos = new Map<number, number>();
        taskIds.forEach((id, idx) => idToPos.set(id, idx));

        state.allTasks = [...state.allTasks].sort((a, b) => {
          const posA = idToPos.has(a.id) ? idToPos.get(a.id)! : a.position ?? 9999;
          const posB = idToPos.has(b.id) ? idToPos.get(b.id)! : b.position ?? 9999;
          return posA - posB;
        });
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch All Tasks (Paginated)
      .addCase(fetchAllTasks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllTasks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.allTasks = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchAllTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch tasks by project
      .addCase(fetchTasks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tasksByProject[action.payload.projectId] = action.payload.tasks;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Create task
      .addCase(createTask.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.isCreating = false;
        const exists = state.allTasks.some((t) => t.id === action.payload.task.id);
        if (!exists) {
          state.allTasks = [action.payload.task, ...state.allTasks];
          state.pagination.total += 1;
        }
        const currentTasks = state.tasksByProject[action.payload.projectId] || [];
        if (!currentTasks.some((t) => t.id === action.payload.task.id)) {
          state.tasksByProject[action.payload.projectId] = [action.payload.task, ...currentTasks];
        }
      })
      .addCase(createTask.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })

      // Update task
      .addCase(updateTask.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.isUpdating = false;
        const allIdx = state.allTasks.findIndex((t) => t.id === action.payload.task.id);
        if (allIdx !== -1) {
          state.allTasks[allIdx] = { ...state.allTasks[allIdx], ...action.payload.task };
        }
        const list = state.tasksByProject[action.payload.projectId];
        if (list) {
          const index = list.findIndex((t) => t.id === action.payload.task.id);
          if (index !== -1) {
            list[index] = action.payload.task;
          }
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })

      // Reorder tasks
      .addCase(reorderTasks.pending, (state) => {
        state.isReordering = true;
      })
      .addCase(reorderTasks.fulfilled, (state) => {
        state.isReordering = false;
      })
      .addCase(reorderTasks.rejected, (state, action) => {
        state.isReordering = false;
        state.error = action.payload as string;
      })

      // Delete task
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.allTasks = state.allTasks.filter((t) => t.id !== action.payload.taskId);
        state.pagination.total = Math.max(0, state.pagination.total - 1);
        const list = state.tasksByProject[action.payload.projectId];
        if (list) {
          state.tasksByProject[action.payload.projectId] = list.filter(
            (t) => t.id !== action.payload.taskId
          );
        }
      });
  },
});

export const {
  clearTasksError,
  setAllTasksOrder,
  onTaskCreatedOrAssigned,
  onTaskUpdated,
  onTaskDeleted,
  onTasksReordered,
} = tasksSlice.actions;

export default tasksSlice.reducer;
