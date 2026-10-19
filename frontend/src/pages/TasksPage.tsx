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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchProjects } from '../store/features/projects/projectsSlice';
import { fetchAllTasks, createTask, updateTask, deleteTask } from '../store/features/tasks/tasksSlice';
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
  { label: string; bg: string; text: string; border: string }
> = {
  PENDING: {
    label: 'Pending',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  COMPLETED: {
    label: 'Completed',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
};

export default function TasksPage() {
  const dispatch = useAppDispatch();
  const { items: projects } = useAppSelector((state) => state.projects);
  const { allTasks, pagination, isLoading: tasksLoading, isCreating, isUpdating } = useAppSelector((state) => state.tasks);

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatus>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

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

  // Fetch all tasks with 10 items per page pagination
  useEffect(() => {
    dispatch(
      fetchAllTasks({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      })
    );
  }, [dispatch, page, debouncedSearch, statusFilter]);

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

  const handleOpenAdd = () => {
    setEditingTask(null);
    setApiError(null);
    reset({
      projectId: projects[0]?.id ? String(projects[0].id) : '',
      title: '',
      description: '',
      status: 'PENDING',
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
      // Re-fetch current page
      dispatch(
        fetchAllTasks({
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        })
      );
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : 'Failed to delete task.');
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
          page,
          limit: 10,
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
            All tasks across projects ({pagination.total} total)
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          disabled={projects.length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition duration-150 shrink-0 disabled:opacity-50"
        >
          <Plus size={16} />
          Add Task
        </button>
      </div>

      {/* ── Search & Status Filters Bar ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center p-1 bg-gray-100 rounded-xl text-xs font-medium text-gray-600">
          {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === st
                  ? 'bg-white text-gray-900 font-semibold shadow-xs'
                  : 'hover:text-gray-900'
              }`}
            >
              {st === 'ALL' ? 'All' : st === 'IN_PROGRESS' ? 'In Progress' : st.charAt(0) + st.slice(1).toLowerCase()}
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

      {/* ── Task Table or Empty State ───────────────────────────────── */}
      {tasksLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 flex flex-col items-center justify-center text-gray-400 space-y-2">
          <Loader2 size={26} className="animate-spin text-gray-900" />
          <p className="text-xs font-medium">Loading tasks...</p>
        </div>
      ) : allTasks.length === 0 ? (
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
            onClick={handleOpenAdd}
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
                  <th className="py-3.5 px-6">Task Title & Description</th>
                  <th className="py-3.5 px-6">Project</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Assignee</th>
                  <th className="py-3.5 px-6">Created Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {allTasks.map((task) => {
                  const statusStyle = statusBadgeConfig[task.status] || statusBadgeConfig.PENDING;
                  const formattedDate = new Date(task.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <tr key={task.id} className="hover:bg-gray-50/70 transition duration-150">
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

          {/* ── Pagination Bar (10 per page) ─────────────────────────── */}
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
                {editingTask && <input type="hidden" {...register('projectId')} value={String(editingTask.projectId)} />}
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

              {/* Status (when editing) */}
              {editingTask && (
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
              )}

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
                  {(isCreating || isUpdating) ? (
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
