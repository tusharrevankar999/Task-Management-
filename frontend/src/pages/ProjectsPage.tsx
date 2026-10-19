import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Briefcase,
  CheckSquare,
  Plus,
  Search,
  Users as UsersIcon,
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

function ProjectModal({ onClose, projectToEdit }: { onClose: () => void; projectToEdit?: Project | null }) {
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
    defaultValues: projectToEdit
      ? {
          name: projectToEdit.name,
          description: projectToEdit.description ?? '',
          isActive: projectToEdit.isActive,
          startDate: projectToEdit.startDate ? projectToEdit.startDate.slice(0, 10) : '',
          endDate: projectToEdit.endDate ? projectToEdit.endDate.slice(0, 10) : '',
        }
      : {
          name: '',
          description: '',
          isActive: true,
          startDate: '',
          endDate: '',
        },
  });

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const onSubmit = async (values: ProjectFormValues) => {
    setApiError(null);
    try {
      if (projectToEdit) {
        const payload: UpdateProjectPayload = {
          name: values.name,
          description: values.description || null,
          isActive: values.isActive,
          startDate: values.startDate || null,
          endDate: values.endDate || null,
          assignedUserIds: selectedUserIds,
          assignedToId: selectedUserIds[0] || null,
        };
        const res = await dispatch(updateProject({ id: projectToEdit.id, payload }));
        if (updateProject.fulfilled.match(res)) {
          toast.success('Project updated successfully!');
          onClose();
        } else {
          const msg = (res.payload as string) || 'Failed to update project.';
          setApiError(msg);
          toast.error(msg);
        }
      } else {
        const payload: CreateProjectPayload = {
          name: values.name,
          description: values.description || null,
          isActive: values.isActive,
          startDate: values.startDate || null,
          endDate: values.endDate || null,
          assignedUserIds: selectedUserIds,
          assignedToId: selectedUserIds[0] || null,
        };
        const res = await dispatch(createProject(payload));
        if (createProject.fulfilled.match(res)) {
          toast.success('Project created successfully!');
          onClose();
        } else {
          const msg = (res.payload as string) || 'Failed to create project.';
          setApiError(msg);
          toast.error(msg);
        }
      }
    } catch {
      const msg = 'An unexpected error occurred.';
      setApiError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                {projectToEdit ? 'Edit Project' : 'Add New Project'}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Configure project details, timeline, and assign team members
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            {apiError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {apiError}
              </div>
            )}

            {/* Section: Project Details */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">
                PROJECT DETAILS
              </p>

              <div className="space-y-4">
                {/* Project Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Project / Client Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('name')}
                    placeholder="e.g. Acme Corporation, Mobile App v2"
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition ${
                      errors.name ? 'border-red-500 bg-red-50/20' : 'border-gray-200'
                    }`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Project Description (Optional)
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    placeholder="Briefly describe project scope, goals, or milestones..."
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition resize-none"
                  />
                </div>

                {/* Active Checkbox Banner */}
                <label
                  htmlFor="project-is-active"
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition select-none"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Active Project
                    </p>
                    <p className="text-xs text-gray-400">
                      Uncheck to set project as archived or on-hold
                    </p>
                  </div>
                  <input
                    id="project-is-active"
                    type="checkbox"
                    {...register('isActive')}
                    className="w-4 h-4 rounded text-gray-900 focus:ring-gray-900 border-gray-300 cursor-pointer accent-gray-900"
                  />
                </label>
              </div>
            </div>

            {/* Section: Timeline & Dates */}
            <div className="pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Start Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Start Date (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      {...register('startDate')}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition"
                    />
                  </div>
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    End Date <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      {...register('endDate')}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Assigned Users (Multiple selection) */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-700">
                  Assign Users ({selectedUserIds.length} selected)
                </label>
                {selectedUserIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedUserIds([])}
                    className="text-[11px] text-gray-500 hover:text-gray-900 underline"
                  >
                    Clear selection
                  </button>
                )}
              </div>

              {/* Multi-user picker container */}
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-56 overflow-y-auto bg-white">
                {users.length === 0 ? (
                  <p className="text-xs text-gray-400 p-4 text-center">
                    No users available
                  </p>
                ) : (
                  users.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleUserSelection(u.id)}
                        className={`flex items-center justify-between p-3 cursor-pointer transition select-none ${
                          isSelected ? 'bg-gray-50 font-medium' : 'hover:bg-gray-50/70'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              isSelected
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {u.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-900">
                              {u.name}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {u.email} • {u.role.toUpperCase()}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                            isSelected
                              ? 'bg-gray-900 border-gray-900 text-white'
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
              <p className="text-[11px] text-gray-400 mt-1.5">
                Click on any user above to assign or unassign them to this project.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-sm font-semibold transition disabled:opacity-50 shadow-sm shadow-gray-900/20"
              >
                {isSubmitting
                  ? 'Saving…'
                  : projectToEdit
                  ? 'Update Project'
                  : 'Save Project'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main Projects Page Component ────────────────────────────────────────────

export default function ProjectsPage() {
  const dispatch = useAppDispatch();
  const { items: projects, isLoading, searchQuery } = useAppSelector(
    (state) => state.projects
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewingTasksProject, setViewingTasksProject] = useState<Project | null>(null);

  useEffect(() => {
    dispatch(fetchProjects({ status: 'active' }));
    dispatch(fetchUsers());
  }, [dispatch]);

  const handleOpenAddModal = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number | string, name: string) => {
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

        <div className="flex items-center gap-3">
          {/* Add Project Button (Black Theme) */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-sm font-semibold shadow-sm shadow-gray-900/20 transition duration-150"
          >
            <Plus size={16} />
            <span>Add Project</span>
          </button>
        </div>
      </div>

      {/* ─── Search Bar ────────────────────────────────────────────────────── */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs">
        <div className="relative w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects or members…"
            value={searchQuery}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-800 placeholder-gray-400 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition"
          />
        </div>
      </div>

      {/* ─── Projects Content: List Table View ───────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
          <div className="w-8 h-8 border-3 border-gray-900 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium text-gray-500">Loading projects…</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300 text-center px-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
            <Briefcase size={28} />
          </div>
          <h3 className="text-base font-bold text-gray-800 mb-1">No projects found</h3>
          <p className="text-xs text-gray-400 max-w-sm mb-6">
            Get started by adding your first project to manage timelines and team assignments.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus size={15} />
            Add New Project
          </button>
        </div>
      ) : (
        /* List Table View */
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Project Name</th>
                  <th className="py-3.5 px-6">Active Period</th>
                  <th className="py-3.5 px-6">Assigned Users</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredProjects.map((project) => {
                  const initials = project.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  // Collect all assigned members
                  const membersList =
                    project.members && project.members.length > 0
                      ? project.members.map((m) => m.user)
                      : project.assignedTo
                      ? [project.assignedTo]
                      : [];

                  return (
                    <tr
                      key={project.id}
                      className="hover:bg-gray-50/70 transition duration-150 group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-900 text-white font-bold flex items-center justify-center text-xs tracking-wider shrink-0 shadow-xs">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              {project.name}
                            </p>
                            {project.description && (
                              <p className="text-xs text-gray-400 truncate max-w-xs">
                                {project.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Active Period */}
                      <td className="py-4 px-6 text-xs text-gray-600 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-gray-400" />
                          <span>{formatDateRange(project.startDate, project.endDate)}</span>
                        </div>
                      </td>

                      {/* Assigned Users (Badges/Avatars) */}
                      <td className="py-4 px-6 text-xs text-gray-700">
                        {membersList.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                            {membersList.slice(0, 3).map((u) => (
                              <span
                                key={u.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 text-[11px] font-medium border border-gray-200"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                                {u.name}
                              </span>
                            ))}
                            {membersList.length > 3 && (
                              <span className="text-[11px] font-semibold text-gray-500 px-1.5 py-0.5 rounded-md bg-gray-100">
                                +{membersList.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-gray-400 italic">
                            <UsersIcon size={14} />
                            <span>Unassigned</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        {project.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={12} />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            Archived
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
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
                            onClick={() => handleOpenEditModal(project)}
                            title="View / Edit details"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(project)}
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
          key={viewingTasksProject.id}
          project={viewingTasksProject}
          onClose={() => setViewingTasksProject(null)}
        />
      )}

      {/* Slide-over Drawer / Modal for Add & Edit */}
      {isModalOpen && (
        <ProjectModal
          key={editingProject ? editingProject.id : 'new-project'}
          onClose={() => setIsModalOpen(false)}
          projectToEdit={editingProject}
        />
      )}
    </div>
  );
}
