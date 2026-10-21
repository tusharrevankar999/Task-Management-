import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ListTodo,
  Plus,
  Search,
  FolderKanban,
  User as UserIcon,
  Calendar,
  AlertCircle,
  Loader2,
  X,
  CheckCircle2,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  LayoutGrid,
  List as ListIcon,
  Clock,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchProjects } from '../store/features/projects/projectsSlice';
import {
  fetchAllTasks,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  setAllTasksOrder,
} from '../store/features/tasks/tasksSlice';
import type { Task, TaskStatus } from '../types';

// ─── Zod Schema for Task Modal (Create & Edit) ──────────────────────────────

const taskFormSchema = z.object({
  projectId: z.string().optional(),
  title: z
    .string()
    .trim()
    .min(1, 'Task title is required')
    .max(255, 'Max 255 characters'),
  description: z.string().max(2000, 'Max 2000 characters').optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
  assignedToId: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

const statusBadgeConfig: Record<
  TaskStatus,
  { label: string; bg: string; text: string; border: string; headerColor: string; icon: any }
> = {
  PENDING: {
    label: 'Pending',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    headerColor: 'bg-amber-500',
    icon: Clock,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    headerColor: 'bg-blue-500',
    icon: Loader2,
  },
  COMPLETED: {
    label: 'Completed',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    headerColor: 'bg-emerald-500',
    icon: CheckCircle,
  },
};

const KANBAN_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'PENDING', label: 'Pending' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'COMPLETED', label: 'Completed' },
];

export default function TasksPage() {
  const dispatch = useAppDispatch();
  const { items: projects } = useAppSelector((state) => state.projects);
  const {
    allTasks,
    pagination,
    isLoading: tasksLoading,
    isCreating,
    isUpdating,
    isReordering,
  } = useAppSelector((state) => state.tasks);

  // View state: 'board' by default
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatus>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Drag-and-drop state for table list view
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Drag-and-drop state for Kanban board view
  const [draggedBoardTask, setDraggedBoardTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load projects for modal select
  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  // Fetch all tasks: when in board view fetch up to 100; in list view 10 per page
  useEffect(() => {
    dispatch(
      fetchAllTasks({
        page: viewMode === 'board' ? 1 : page,
        limit: viewMode === 'board' ? 100 : 10,
        search: debouncedSearch || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      })
    );
  }, [dispatch, page, debouncedSearch, statusFilter, viewMode]);

  // Calculate live statistics for summary cards
  const stats = useMemo(() => {
    const total = allTasks.length;
    const pending = allTasks.filter((t) => t.status === 'PENDING').length;
    const inProgress = allTasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const completed = allTasks.filter((t) => t.status === 'COMPLETED').length;
    return { total, pending, inProgress, completed };
  }, [allTasks]);

  // Form handling
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      projectId: projects[0]?.id ? String(projects[0].id) : '',
      title: '',
      description: '',
      status: 'PENDING',
      assignedToId: '',
    },
  });

  const formProjectId = watch('projectId');

  const modalProject = useMemo(() => {
    return projects.find((p) => p.id === Number(formProjectId)) || projects[0] || null;
  }, [projects, formProjectId]);

  const modalMembers = useMemo(() => {
    if (!modalProject) return [];
    if (modalProject.members && modalProject.members.length > 0) {
      return modalProject.members.map((m) => m.user);
    }
    return modalProject.assignedTo ? [modalProject.assignedTo] : [];
  }, [modalProject]);

  const handleOpenAdd = (defaultStatus: TaskStatus = 'PENDING') => {
    setEditingTask(null);
    setApiError(null);
    reset({
      projectId: projects[0]?.id ? String(projects[0].id) : '',
      title: '',
      description: '',
      status: defaultStatus,
      assignedToId: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setApiError(null);
    reset({
      projectId: String(task.projectId),
      title: task.title,
      description: task.description || '',
      status: task.status,
      assignedToId: task.assignedTo ? String(task.assignedTo.id) : '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteTask = async (task: Task) => {
    if (!window.confirm(`Are you sure you want to delete task "${task.title}"?`)) return;

    try {
      await dispatch(deleteTask({ projectId: task.projectId, taskId: task.id })).unwrap();
      toast.success('Task deleted successfully');
      dispatch(
        fetchAllTasks({
          page: viewMode === 'board' ? 1 : page,
          limit: viewMode === 'board' ? 100 : 10,
          search: debouncedSearch || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        })
      );
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : 'Failed to delete task.');
    }
  };

  // ─── List Drag-and-Drop Handlers ───────────────────────────────────────────

  const handleListDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleListDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleListDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleListDrop = async (e: React.DragEvent<HTMLTableRowElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...allTasks];
    const [movedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, movedItem);

    dispatch(setAllTasksOrder(reordered));
    setDraggedIndex(null);
    setDragOverIndex(null);

    try {
      const taskIds = reordered.map((t) => t.id);
      await dispatch(reorderTasks({ taskIds })).unwrap();
      toast.success('Task order updated');
    } catch {
      toast.error('Failed to save task order');
      dispatch(
        fetchAllTasks({
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        })
      );
    }
  };

  // ─── Board Kanban Drag-and-Drop Handlers ───────────────────────────────────

  const handleBoardDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    setDraggedBoardTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(task.id));
  };

  const handleBoardDragOverCol = (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleBoardDragLeaveCol = (status: TaskStatus) => {
    if (dragOverColumn === status) {
      setDragOverColumn(null);
    }
  };

  const handleBoardDropOnColumn = async (e: React.DragEvent<HTMLDivElement>, targetStatus: TaskStatus) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(null);

    const rawTaskId = e.dataTransfer.getData('text/plain');
    const task = draggedBoardTask || allTasks.find((t) => String(t.id) === rawTaskId);
    setDraggedBoardTask(null);

    if (!task) return;
    if (task.status === targetStatus) return;

    const readableStatus =
      targetStatus === 'IN_PROGRESS'
        ? 'In Progress'
        : targetStatus === 'COMPLETED'
        ? 'Completed'
        : 'Pending';

    // Optimistically update status in state immediately
    const updatedTasks = allTasks.map((t) =>
      t.id === task.id ? { ...t, status: targetStatus } : t
    );
    dispatch(setAllTasksOrder(updatedTasks));

    // Show toast immediately
    toast.success(`Task moved to ${readableStatus}!`);

    try {
      await dispatch(
        updateTask({
          projectId: task.projectId,
          taskId: task.id,
          payload: {
            status: targetStatus,
          },
        })
      ).unwrap();
    } catch {
      toast.error('Failed to update task status in database');
      dispatch(
        fetchAllTasks({
          page: 1,
          limit: 100,
          search: debouncedSearch || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        })
      );
    }
  };

  const onSubmit = async (values: TaskFormValues) => {
    setApiError(null);
    try {
      const assignedId = values.assignedToId ? Number(values.assignedToId) : null;
      const targetProjId = Number(values.projectId || editingTask?.projectId || projects[0]?.id);

      if (editingTask) {
        await dispatch(
          updateTask({
            projectId: targetProjId,
            taskId: editingTask.id,
            payload: {
              title: values.title.trim(),
              description: values.description?.trim() || null,
              status: values.status,
              assignedToId: assignedId,
            },
          })
        ).unwrap();
        toast.success('Task updated successfully!');
      } else {
        await dispatch(
          createTask({
            projectId: targetProjId,
            payload: {
              title: values.title.trim(),
              description: values.description?.trim() || null,
              assignedToId: assignedId,
            },
          })
        ).unwrap();
        toast.success('Task created successfully!');
      }

      setIsModalOpen(false);
      setEditingTask(null);
      reset();

      // Refresh list
      dispatch(
        fetchAllTasks({
          page: viewMode === 'board' ? 1 : page,
          limit: viewMode === 'board' ? 100 : 10,
          search: debouncedSearch || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        })
      );
    } catch (err: any) {
      setApiError(typeof err === 'string' ? err : 'Operation failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Task Management</h1>
          <p className="text-xs text-gray-500 mt-1">
            {viewMode === 'board'
              ? 'Drag and drop cards between status columns to update status & order.'
              : `Drag rows to reorder tasks (${pagination.total} total).`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle (Board / List) */}
          <div className="flex items-center p-1 bg-gray-100 rounded-xl border border-gray-200/80 shadow-xs">
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'board'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <LayoutGrid size={15} />
              Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <ListIcon size={15} />
              List
            </button>
          </div>

          {isReordering && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium animate-pulse">
              <Loader2 size={13} className="animate-spin text-gray-900" />
              Saving...
            </span>
          )}

          <button
            onClick={() => handleOpenAdd('PENDING')}
            disabled={projects.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition duration-150 shrink-0 disabled:opacity-50"
          >
            <Plus size={16} />
            Add Task
          </button>
        </div>
      </div>

      {/* ── Status Metric Cards (Reference UI) ─────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* TOTAL TASKS */}
        <div
          onClick={() => {
            setStatusFilter('ALL');
            setPage(1);
          }}
          className="bg-white rounded-2xl px-6 py-8 min-h-[140px] border-2 border-gray-200 hover:border-black cursor-pointer transition-all duration-200 hover:shadow-md flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Total Tasks
            </p>
            <p className="text-3xl font-extrabold text-gray-900 mt-2">
              {stats.total}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gray-100/80 flex items-center justify-center text-gray-700 shrink-0">
            <Calendar size={22} />
          </div>
        </div>

        {/* IN PROGRESS */}
        <div
          onClick={() => {
            setStatusFilter('IN_PROGRESS');
            setPage(1);
          }}
          className={`bg-white rounded-2xl px-6 py-8 min-h-[140px] border cursor-pointer transition-all duration-200 hover:shadow-md flex items-center justify-between ${
            statusFilter === 'IN_PROGRESS'
              ? 'border-2 border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
              : 'border-2 border-gray-200 hover:border-black'
          }`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              In Progress
            </p>
            <p className="text-3xl font-extrabold text-blue-600 mt-2">
              {stats.inProgress}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Clock size={22} />
          </div>
        </div>

        {/* PENDING */}
        <div
          onClick={() => {
            setStatusFilter('PENDING');
            setPage(1);
          }}
          className={`bg-white rounded-2xl px-6 py-8 min-h-[140px] border cursor-pointer transition-all duration-200 hover:shadow-md flex items-center justify-between ${
            statusFilter === 'PENDING'
              ? 'border-2 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
              : 'border-2 border-gray-200 hover:border-black'
          }`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Pending
            </p>
            <p className="text-3xl font-extrabold text-amber-600 mt-2">
              {stats.pending}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Clock size={22} />
          </div>
        </div>

        {/* COMPLETED */}
        <div
          onClick={() => {
            setStatusFilter('COMPLETED');
            setPage(1);
          }}
          className={`bg-white rounded-2xl px-6 py-8 min-h-[140px] border cursor-pointer transition-all duration-200 hover:shadow-md flex items-center justify-between ${
            statusFilter === 'COMPLETED'
              ? 'border-2 border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm'
              : 'border-2 border-gray-200 hover:border-black'
          }`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Completed Tasks
            </p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-2">
              {stats.completed}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Tabs Bar ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Status Pill Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-gray-900 text-white shadow-xs font-bold'
                  : 'bg-gray-100/80 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70'
              }`}
            >
              {st === 'ALL'
                ? 'All'
                : st === 'IN_PROGRESS'
                ? 'In Progress'
                : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search box */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, description, or assignee..."
            className="w-full pl-8 pr-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:bg-white transition"
          />
        </div>
      </div>

      {/* ── Content View: Board View (Default) OR List View ─────────── */}
      {tasksLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 flex flex-col items-center justify-center text-gray-400 space-y-2">
          <Loader2 size={26} className="animate-spin text-gray-900" />
          <p className="text-xs font-medium">Loading tasks...</p>
        </div>
      ) : viewMode === 'board' ? (
        /* ═══════════════════════════════════════════════════════════════ */
        /* ── KANBAN BOARD VIEW ────────────────────────────────────────── */
        /* ═══════════════════════════════════════════════════════════════ */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const config = statusBadgeConfig[col.status];
            const colTasks = allTasks.filter((t) => t.status === col.status);
            const isTargetCol = dragOverColumn === col.status;

            return (
              <div
                key={col.status}
                onDragOver={(e) => handleBoardDragOverCol(e, col.status)}
                onDragLeave={() => handleBoardDragLeaveCol(col.status)}
                onDrop={(e) => handleBoardDropOnColumn(e, col.status)}
                className={`flex flex-col rounded-2xl border p-4 transition-all duration-200 min-h-[500px] ${
                  isTargetCol
                    ? 'bg-blue-50/80 border-blue-400 shadow-md ring-2 ring-blue-400/20'
                    : 'bg-gray-100/60 border-gray-200/80 shadow-2xs'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200/60">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${config.headerColor}`} />
                    <h3 className="font-bold text-sm text-gray-900 tracking-tight">
                      {col.label}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-[11px] font-semibold text-gray-600 shadow-2xs">
                      {colTasks.length}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenAdd(col.status)}
                    title={`Add task to ${col.label}`}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-white transition shadow-2xs"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Task Cards Column */}
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="h-40 border-2 border-dashed border-gray-200/80 rounded-xl flex flex-col items-center justify-center text-center p-4 text-gray-400">
                      <p className="text-xs font-medium">No tasks in {col.label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Drag tasks here or click +</p>
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const isBeingDragged = draggedBoardTask?.id === task.id;
                      const formattedDate = new Date(task.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      });

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleBoardDragStart(e, task)}
                          className={`group bg-white rounded-xl border-2 border-gray-200 p-4 shadow-xs transition-all duration-200 cursor-grab active:cursor-grabbing select-none hover:border-black hover:shadow-lg hover:ring-1 hover:ring-black ${
                            isBeingDragged ? 'opacity-30 scale-95 border-black' : ''
                          }`}
                        >
                          {/* Card Top: Project + Actions */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200 text-[10px] font-semibold text-gray-600 truncate max-w-[170px]">
                              <FolderKanban size={11} className="text-gray-400 shrink-0" />
                              {task.project ? task.project.name : `Project #${task.projectId}`}
                            </span>

                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                              <button
                                onClick={() => handleOpenEdit(task)}
                                title="Edit"
                                className="p-1 rounded text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task)}
                                title="Delete"
                                className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Title & Description */}
                          <h4 className="font-semibold text-xs text-gray-900 line-clamp-2 leading-snug mb-1">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-[11px] text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Card Bottom: Assignee & Date */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 text-[11px] text-gray-500">
                            {task.assignedTo ? (
                              <div className="flex items-center gap-1.5 font-medium text-gray-700 truncate max-w-[140px]">
                                <div className="w-4 h-4 rounded-full bg-gray-900 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                  {task.assignedTo.name[0]?.toUpperCase()}
                                </div>
                                <span className="truncate">{task.assignedTo.name}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic flex items-center gap-1">
                                <UserIcon size={11} /> Unassigned
                              </span>
                            )}

                            <span className="flex items-center gap-1 text-gray-400 shrink-0">
                              <Calendar size={11} /> {formattedDate}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════ */
        /* ── TABLE LIST VIEW ─────────────────────────────────────────── */
        /* ═══════════════════════════════════════════════════════════════ */
        allTasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mb-4">
              <ListTodo size={28} />
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-1">No tasks found</h3>
            <p className="text-xs text-gray-400 max-w-sm mb-6">
              {debouncedSearch || statusFilter !== 'ALL'
                ? 'No tasks match your search or filter criteria.'
                : 'There are no tasks created yet. Click "Add Task" to create your first task.'}
            </p>
            <button
              onClick={() => handleOpenAdd('PENDING')}
              disabled={projects.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition"
            >
              <Plus size={15} />
              Add Task
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-10 text-center">Order</th>
                    <th className="py-3.5 px-6">Task Title & Description</th>
                    <th className="py-3.5 px-6">Project</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Assignee</th>
                    <th className="py-3.5 px-6">Created Date</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {allTasks.map((task, index) => {
                    const statusStyle = statusBadgeConfig[task.status] || statusBadgeConfig.PENDING;
                    const formattedDate = new Date(task.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });

                    const isDragging = draggedIndex === index;
                    const isOver = dragOverIndex === index;

                    return (
                      <tr
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleListDragStart(e, index)}
                        onDragOver={(e) => handleListDragOver(e, index)}
                        onDragEnd={handleListDragEnd}
                        onDrop={(e) => handleListDrop(e, index)}
                        className={`transition duration-150 cursor-grab active:cursor-grabbing select-none hover:border-black ${
                          isDragging
                            ? 'opacity-30 bg-gray-100 scale-98'
                            : isOver
                            ? 'bg-blue-50/70 border-t-2 border-t-blue-500'
                            : 'hover:bg-gray-50/70'
                        }`}
                      >
                        {/* Drag Handle & Position Indicator */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1 text-gray-400 hover:text-gray-700">
                            <GripVertical size={16} className="shrink-0" />
                            <span className="text-[10px] font-mono text-gray-400">
                              {(page - 1) * 10 + index + 1}
                            </span>
                          </div>
                        </td>

                        {/* Title & Description */}
                        <td className="py-4 px-6">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                              <CheckCircle2 size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 text-xs sm:text-sm">
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 max-w-md leading-relaxed">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Project badge */}
                        <td className="py-4 px-6 text-xs text-gray-700">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 text-[11px] font-medium border border-gray-200">
                            <FolderKanban size={13} className="text-gray-500" />
                            {task.project ? task.project.name : `Project #${task.projectId}`}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                          >
                            {statusStyle.label}
                          </span>
                        </td>

                        {/* Assignee */}
                        <td className="py-4 px-6 text-xs text-gray-700">
                          {task.assignedTo ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 text-[11px] font-medium border border-gray-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                              {task.assignedTo.name}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-gray-400 italic text-[11px]">
                              <UserIcon size={12} />
                              <span>Unassigned</span>
                            </div>
                          )}
                        </td>

                        {/* Created Date */}
                        <td className="py-4 px-6 text-xs text-gray-500 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-gray-400" />
                            <span>{formattedDate}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(task)}
                              title="Edit task"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task)}
                              title="Delete task"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination for List View */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/40">
              <div>
                Showing{' '}
                <span className="font-semibold text-gray-800">
                  {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-gray-800">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of <span className="font-semibold text-gray-800">{pagination.total}</span> tasks
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
                >
                  <ChevronLeft size={14} />
                  Previous
                </button>
                <span className="px-2 text-gray-600 font-semibold">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {/* ── Slide-over / Modal for Creating & Editing Task ───────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col border-l border-gray-100 animate-slideLeft">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold shadow-xs">
                  {editingTask ? <Edit2 size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 leading-tight">
                    {editingTask ? 'Edit Task' : 'Add New Task'}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {editingTask ? 'Update task details, status, or assignee' : 'Create a task under an accessible project'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col p-6 space-y-5">
              {apiError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{apiError}</span>
                </div>
              )}

              {/* Project Select */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Project <span className="text-red-500">*</span>
                </label>
                {editingTask && (
                  <input type="hidden" {...register('projectId')} value={String(editingTask.projectId)} />
                )}
                <select
                  disabled={!!editingTask}
                  {...register('projectId')}
                  className={`w-full px-3.5 py-2.5 bg-gray-50 rounded-xl border text-xs text-gray-800 focus:outline-none focus:ring-2 focus:bg-white transition disabled:opacity-60 ${
                    errors.projectId
                      ? 'border-red-300 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-gray-900/10 focus:border-gray-900'
                  }`}
                >
                  {projects.map((proj) => (
                    <option key={proj.id} value={String(proj.id)}>
                      {proj.name}
                    </option>
                  ))}
                </select>
                {errors.projectId && (
                  <p className="mt-1 text-[11px] text-red-500">{errors.projectId.message}</p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Build Login Component"
                  {...register('title')}
                  className={`w-full px-3.5 py-2.5 bg-gray-50 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:bg-white transition ${
                    errors.title
                      ? 'border-red-300 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-gray-900/10 focus:border-gray-900'
                  }`}
                />
                {errors.title && (
                  <p className="mt-1 text-[11px] text-red-500">{errors.title.message}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Status
                </label>
                <select
                  {...register('status')}
                  className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:bg-white focus:border-gray-900 transition"
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe the task expectations and requirements..."
                  {...register('description')}
                  className={`w-full px-3.5 py-2.5 bg-gray-50 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:bg-white transition resize-none ${
                    errors.description
                      ? 'border-red-300 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-gray-900/10 focus:border-gray-900'
                  }`}
                />
                {errors.description && (
                  <p className="mt-1 text-[11px] text-red-500">{errors.description.message}</p>
                )}
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Assign To (Project Members)
                </label>
                <select
                  {...register('assignedToId')}
                  className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:bg-white focus:border-gray-900 transition"
                >
                  <option value="">Unassigned</option>
                  {modalMembers.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-gray-400">
                  Only members who belong to the selected project can be assigned.
                </p>
              </div>

              <div className="flex-1" />

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {isCreating || isUpdating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : editingTask ? (
                    'Save Changes'
                  ) : (
                    'Create Task'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
