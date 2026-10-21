// ─── User & Auth types ─────────────────────────────────────────────────────

export type Role = 'admin' | 'user';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt?: string;
}

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// ─── API payload types ─────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface UpdateUserPayload {
  name?: string;
  role?: Role;
  isActive?: boolean;
}

// ─── Project types ──────────────────────────────────────────────────────────

export interface ProjectMemberItem {
  id: number;
  projectId: number;
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface Project {
  id: number;
  name: string;
  description?: string | null;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  assignedToId?: number | null;
  assignedTo?: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
  members?: ProjectMemberItem[];
  createdById: number;
  createdBy?: {
    id: number;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string | null;
  isActive?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  assignedToId?: number | null;
  assignedUserIds?: number[];
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  assignedToId?: number | null;
  assignedUserIds?: number[];
}

// ─── Task types ─────────────────────────────────────────────────────────────

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface TaskAssignee {
  id: number;
  name: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  position?: number;
  projectId: number;
  project?: {
    id: number;
    name: string;
  } | null;
  assignedTo: TaskAssignee | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
  assignedToId?: number | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  assignedToId?: number | null;
  position?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
