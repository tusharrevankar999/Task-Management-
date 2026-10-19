import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  X,
  Plus,
  CheckCircle2,
  ListTodo,
  User as UserIcon,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchTasks, createTask } from '../store/features/tasks/tasksSlice';
import type { Project, TaskStatus } from '../types';

// ─── Zod Schema for Task Creation Form ───────────────────────────────────────

const createTaskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Task title is required')
    .max(255, 'Max 255 characters'),
  description: z.string().max(2000, 'Max 2000 characters').optional(),
  assignedToId: z.string().optional(),
});

type TaskFormValues = z.infer<typeof createTaskFormSchema>;

interface ProjectTasksModalProps {
  project: Project;
  onClose: () => void;
}

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

export default function ProjectTasksModal({ project, onClose }: ProjectTasksModalProps) {
  const dispatch = useAppDispatch();
  const { tasksByProject, isLoading, isCreating } = useAppSelector((state) => state.tasks);
  const tasks = tasksByProject[project.id] || [];

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchTasks(project.id));
  }, [dispatch, project.id]);

  // Project members list for assignee dropdown
  const memberUsers =
    project.members && project.members.length > 0
      ? project.members.map((m) => m.user)
      : project.assignedTo
      ? [project.assignedTo]
      : [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(createTaskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      assignedToId: '',
    },
  });

  const onSubmit = async (values: TaskFormValues) => {
    setApiError(null);
    try {
      const assignedId = values.assignedToId ? Number(values.assignedToId) : null;
      await dispatch(
        createTask({
          projectId: project.id,
          payload: {
            title: values.title.trim(),
            description: values.description?.trim() || null,
            assignedToId: assignedId,
          },
        })
      ).unwrap();

      toast.success('Task created successfully!');
      reset();
      setIsFormOpen(false);
    } catch (err: any) {
      setApiError(typeof err === 'string' ? err : 'Failed to create task.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-gray-100 animate-slideLeft">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <ListTodo size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">
                {project.name} Tasks
              </h2>
              <p className="text-xs text-gray-400">
                {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} in project
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Action Toolbar */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Task List</h3>
            {!isFormOpen && (
              <button
                onClick={() => {
                  setApiError(null);
                  setIsFormOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition"
              >
                <Plus size={14} />
                Create Task
              </button>
            )}
          </div>

          {/* Create Task Form (Collapsible card) */}
          {isFormOpen && (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="bg-gray-50 rounded-2xl p-5 border border-gray-200/80 space-y-4 shadow-xs animate-fadeIn"
            >
              <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  New Task
                </span>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                >
                  Cancel
                </button>
              </div>

              {apiError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{apiError}</span>
                </div>
              )}

              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Build login API"
                  {...register('title')}
                  className={`w-full px-3.5 py-2 bg-white rounded-xl border text-xs focus:outline-none focus:ring-2 transition ${
                    errors.title
                      ? 'border-red-300 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-gray-900/10 focus:border-gray-900'
                  }`}
                />
                {errors.title && (
                  <p className="mt-1 text-[11px] text-red-500">{errors.title.message}</p>
                )}
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Task details and expectations..."
                  {...register('description')}
                  className={`w-full px-3.5 py-2 bg-white rounded-xl border text-xs focus:outline-none focus:ring-2 transition resize-none ${
                    errors.description
                      ? 'border-red-300 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-gray-900/10 focus:border-gray-900'
                  }`}
                />
                {errors.description && (
                  <p className="mt-1 text-[11px] text-red-500">{errors.description.message}</p>
                )}
              </div>

              {/* Assignee select */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Assign To (Project Members)
                </label>
                <select
                  {...register('assignedToId')}
                  className="w-full px-3.5 py-2 bg-white rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition"
                >
                  <option value="">Unassigned</option>
                  {memberUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-gray-400">
                  Only members of this project can be assigned.
                </p>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Add Task'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Tasks List rendering */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 space-y-2">
              <Loader2 size={24} className="animate-spin text-gray-900" />
              <p className="text-xs">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center border-2 border-dashed border-gray-100 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="text-xs font-bold text-gray-800 mb-0.5">No tasks yet</h4>
              <p className="text-xs text-gray-400 max-w-xs mb-4">
                This project has no tasks created. Click "Create Task" to add your first one.
              </p>
              {!isFormOpen && (
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-black transition"
                >
                  <Plus size={13} />
                  Add First Task
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const statusStyle = statusBadgeConfig[task.status] || statusBadgeConfig.PENDING;
                const formattedDate = new Date(task.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl border border-gray-200/90 bg-white hover:border-gray-300 hover:shadow-xs transition duration-150 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-gray-900 leading-snug">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-xs text-gray-500 mt-1 whitespace-pre-line leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} shrink-0`}
                      >
                        {statusStyle.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <UserIcon size={12} className="text-gray-400" />
                        <span className="font-medium text-gray-600">
                          {task.assignedTo ? task.assignedTo.name : 'Unassigned'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{formattedDate}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
