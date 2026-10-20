import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Briefcase,
  CheckSquare,
  Plus,
  Search,
   
  X,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  setSearchQuery,
} from '../store/features/projects/projectsSlice';
import { fetchUsers } from '../store/features/users/usersSlice';
import type { CreateProjectPayload, Project, UpdateProjectPayload } from '../types';
import ProjectTasksModal from '../components/ProjectTasksModal';
import { useAuth } from '../context/useAuth';

// ─── Zod Schema for Project Form ─────────────────────────────────────────────

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Max 100 characters'),
  description: z.string().max(1000).optional(),
  isActive: z.boolean(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

// ─── Helper for Date Display ─────────────────────────────────────────────────

function formatDateRange(startDate?: string | null, endDate?: string | null): string {
  if (!startDate && !endDate) return 'No timeline set';

  const format = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  if (startDate && endDate) {
    return `${format(startDate)} – ${format(endDate)}`;
  }
  if (startDate) {
    return `${format(startDate)} – Present`;
  }
  return `Until ${format(endDate!)}`;
}

// ─── Add / Edit Project Slide-over Modal ──────────────────────────────────────

function ProjectModal({
  onClose,
  projectToEdit,
  readOnly = false,
}: {
  onClose: () => void;
  projectToEdit?: Project | null;
  readOnly?: boolean;
}) {
  const dispatch = useAppDispatch();
  const { users } = useAppSelector((state) => state.users);

  // Initialize selectedUserIds directly from projectToEdit or empty
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>(() => {
    if (!projectToEdit) return [];
    if (projectToEdit.members && projectToEdit.members.length > 0) {
      return projectToEdit.members.map((m) => m.userId);
    }
    return projectToEdit.assignedToId ? [projectToEdit.assignedToId] : [];
  });
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: projectToEdit?.name ?? '',
      description: projectToEdit?.description ?? '',
      isActive: projectToEdit?.isActive ?? true,
      startDate: projectToEdit?.startDate ? projectToEdit.startDate.slice(0, 10) : '',
      endDate: projectToEdit?.endDate ? projectToEdit.endDate.slice(0, 10) : '',
    },
  });

  const toggleUserSelection = (userId: number) => {
    if (readOnly) return;
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const onSubmit = async (values: ProjectFormValues) => {
    if (readOnly) {
      onClose();
      return;
    }
    setApiError(null);

    const payload: CreateProjectPayload | UpdateProjectPayload = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      isActive: values.isActive,
      startDate: values.startDate ? new Date(values.startDate).toISOString() : undefined,
      endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
      assignedUserIds: selectedUserIds,
    };

    try {
      if (projectToEdit) {
        const res = await dispatch(
          updateProject({ id: projectToEdit.id, payload: payload as UpdateProjectPayload })
        );
        if (updateProject.fulfilled.match(res)) {
          toast.success('Project updated successfully');
          onClose();
        } else {
          setApiError((res.payload as string) || 'Failed to update project');
        }
      } else {
        const res = await dispatch(createProject(payload as CreateProjectPayload));
        if (createProject.fulfilled.match(res)) {
          toast.success('Project created successfully');
          onClose();
        } else {
          setApiError((res.payload as string) || 'Failed to create project');
        }
      }
    } catch {
      setApiError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-white">
              <Briefcase size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {readOnly ? 'Project Details' : projectToEdit ? 'Edit Project' : 'Create New Project'}
              </h2>
              <p className="text-xs text-gray-500">
                {readOnly
                  ? 'Overview of project information'
                  : projectToEdit
                  ? 'Update project details and user assignments'
                  : 'Add a new project to your workspace'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto flex-1 p-6">
          {apiError && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {apiError}
            </div>
          )}

          <form id="project-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Project Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Project Name *
              </label>
              <input
                type="text"
                disabled={readOnly}
                placeholder="e.g. Website Redesign Q4"
                {...register('name')}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none transition ${
                  readOnly ? 'bg-gray-50 text-gray-600' : ''
                } ${
                  errors.name
                    ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                    : 'border-gray-200 focus:border-gray-900 bg-white'
                }`}
              />
              {errors.name && (
                <p className="text-xs text-rose-500 mt-1 font-medium">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Brief summary of the project goals..."
                {...register('description')}
                className={`w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-gray-900 focus:outline-none text-sm text-gray-900 transition resize-none ${
                  readOnly ? 'bg-gray-50 text-gray-600' : ''
                }`}
              />
            </div>

            {/* Dates (Start / End) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  disabled={readOnly}
                  {...register('startDate')}
                  className={`w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-gray-900 focus:outline-none text-xs text-gray-900 ${
                    readOnly ? 'bg-gray-50 text-gray-600' : ''
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  disabled={readOnly}
                  {...register('endDate')}
                  className={`w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-gray-900 focus:outline-none text-xs text-gray-900 ${
                    readOnly ? 'bg-gray-50 text-gray-600' : ''
                  }`}
                />
              </div>
            </div>

            {/* Status Active toggle */}
            <div className="pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  {...register('isActive')}
                  className="w-4 h-4 rounded text-gray-900 focus:ring-0 border-gray-300"
                />
                <span className="text-xs font-medium text-gray-700">Project is active</span>
              </label>
            </div>

            {/* Assigned Users Checklist */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Assigned Team Members ({selectedUserIds.length})
                </label>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 p-1 border border-gray-100 rounded-xl bg-gray-50/50">
                {users.length === 0 ? (
                  <p className="text-xs text-gray-400 p-2 text-center">No users available</p>
                ) : (
                  users.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleUserSelection(u.id)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition select-none ${
                          isSelected
                            ? 'bg-blue-50 text-blue-900 border border-blue-200/60 font-medium'
                            : 'bg-white hover:bg-gray-100/80 text-gray-700 border border-gray-200/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 font-semibold flex items-center justify-center text-[10px] shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate">{u.name}</span>
                          <span className="text-[10px] text-gray-400 truncate hidden sm:inline">
                            ({u.email})
                          </span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
              >
                {readOnly ? 'Close' : 'Cancel'}
              </button>
              {!readOnly && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold transition shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : null}
                  <span>{projectToEdit ? 'Save Changes' : 'Create Project'}</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main Projects Page Component ────────────────────────────────────────────

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const dispatch = useAppDispatch();
  const { items: projects, isLoading, searchQuery } = useAppSelector(
    (state) => state.projects
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isReadOnlyModal, setIsReadOnlyModal] = useState(false);
  const [viewingTasksProject, setViewingTasksProject] = useState<Project | null>(null);

  useEffect(() => {
    dispatch(fetchProjects({ status: 'active' }));
    dispatch(fetchUsers());
  }, [dispatch]);

  const handleOpenAddModal = () => {
    setEditingProject(null);
    setIsReadOnlyModal(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (project: Project, readOnly = false) => {
    setEditingProject(project);
    setIsReadOnlyModal(readOnly);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number | string, name: string) => {
    if (!isAdmin) {
      toast.error('Only administrators can delete projects');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await dispatch(deleteProject(id));
      if (deleteProject.fulfilled.match(res)) {
        toast.success('Project deleted');
      } else {
        toast.error((res.payload as string) || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete project');
    }
  };

  // Filter projects by search query
  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchesMembers = p.members?.some((m) =>
      m.user.name.toLowerCase().includes(q)
    );
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.assignedTo?.name && p.assignedTo.name.toLowerCase().includes(q)) ||
      matchesMembers
    );
  });

  return (
    <div className="space-y-6">
      {/* ─── Top Bar: Title & Primary Action ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Project Hub</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage projects, timelines, brand configurations, and member assignments
          </p>
        </div>

        {/* Add Project Button (Admin Only) */}
        {isAdmin && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-sm font-semibold shadow-sm shadow-gray-900/20 transition duration-150"
            >
              <Plus size={16} />
              <span>Add Project</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── Search Bar ────────────────────────────────────────────────────── */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs">
        <div className="relative w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects or members..."
            value={searchQuery}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:bg-white focus:border-gray-900 transition"
          />
        </div>
      </div>

      {/* ─── Projects Table ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500">Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 mx-auto mb-3">
            <Briefcase size={22} />
          </div>
          <h3 className="text-sm font-bold text-gray-900">No projects found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Try modifying your search criteria to find what you are looking for.'
              : isAdmin
              ? 'Get started by creating your first project and assigning team members.'
              : 'You have not been assigned to any projects yet.'}
          </p>
          {!searchQuery && isAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-black transition"
            >
              <Plus size={14} />
              <span>Create Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Project Name</th>
                  <th className="py-3.5 px-4">Active Period</th>
                  <th className="py-3.5 px-4">Assigned Users</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {filteredProjects.map((project) => {
                  const initials = project.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  const membersList = project.members && project.members.length > 0
                    ? project.members.map((m) => m.user)
                    : project.assignedTo
                    ? [project.assignedTo]
                    : [];

                  return (
                    <tr
                      key={project.id}
                      className="hover:bg-gray-50/80 transition duration-150 group"
                    >
                      {/* Name & description */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold text-xs shrink-0 tracking-tight">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              {project.name}
                            </p>
                            {project.description ? (
                              <p className="text-[11px] text-gray-400 truncate max-w-xs mt-0.5">
                                {project.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Timeline */}
                      <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-gray-400 shrink-0" />
                          <span>{formatDateRange(project.startDate, project.endDate)}</span>
                        </div>
                      </td>

                      {/* Assigned Users Avatars / Pill */}
                      <td className="py-3.5 px-4">
                        {membersList.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {membersList.slice(0, 3).map((u) => (
                              <span
                                key={u.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-700 font-medium"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                                {u.name}
                              </span>
                            ))}
                            {membersList.length > 3 && (
                              <span className="text-[10px] text-gray-400 font-medium ml-1">
                                +{membersList.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {project.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            Archived
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingTasksProject(project)}
                            title="View tasks"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition flex items-center gap-1 text-xs font-semibold"
                          >
                            <CheckSquare size={15} />
                            <span className="hidden sm:inline">Tasks</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(project, true)}
                            title="View details"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition"
                          >
                            <Eye size={16} />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(project, false)}
                                title="Edit project"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(project.id, project.name)}
                                title="Delete project"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Project Tasks Drawer / Modal */}
      {viewingTasksProject && (
        <ProjectTasksModal
          project={viewingTasksProject}
          onClose={() => setViewingTasksProject(null)}
        />
      )}

      {/* Slide-over Modal for Add / Edit Project */}
      {isModalOpen && (
        <ProjectModal
          onClose={() => setIsModalOpen(false)}
          projectToEdit={editingProject}
          readOnly={isReadOnlyModal}
        />
      )}
    </div>
  );
}
