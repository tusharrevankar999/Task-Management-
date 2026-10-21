import { zodResolver } from '@hookform/resolvers/zod';
import {
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../../store/features/users/usersSlice';
import type { CreateUserPayload, UpdateUserPayload, User } from '../../types';



// ─── Schemas ─────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  role: z.enum(['admin', 'user'] as const),
});

const editSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['admin', 'user'] as const),
  isActive: z.boolean(),
});

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  return (
    <div
      id="modal-overlay"
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="card w-full max-w-md p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            id="modal-close"
            onClick={onClose}
            className="btn-icon"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Create User Form ─────────────────────────────────────────────────────────

function CreateUserForm({
  onSuccess,
  onClose,
}: {
  onSuccess: (user: User) => void;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', email: '', password: '', role: 'user' },
  });

  const onSubmit = async (values: CreateValues) => {
    setApiError(null);
    try {
      const payload: CreateUserPayload = values;
      const resultAction = await dispatch(createUser(payload));
      if (createUser.fulfilled.match(resultAction)) {
        onSuccess(resultAction.payload);
      } else {
        const msg = (resultAction.payload as string) || 'Failed to create user. Please check requirements.';
        setApiError(msg);
        toast.error(msg);
      }
    } catch {
      const msg = 'Failed to create user. Please check requirements.';
      setApiError(msg);
      toast.error(msg);
    }
  };

  return (
    <form id="create-user-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {apiError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {apiError}
        </div>
      )}

      <div>
        <label htmlFor="cu-name" className="form-label">Full Name</label>
        <input id="cu-name" {...register('name')} placeholder="John Doe"
          className={`input-field pl-4 ${errors.name ? 'input-field-error' : ''}`} />
        {errors.name && <p className="error-text">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="cu-email" className="form-label">Email Address</label>
        <input id="cu-email" type="email" {...register('email')} placeholder="john@example.com"
          className={`input-field pl-4 ${errors.email ? 'input-field-error' : ''}`} />
        {errors.email && <p className="error-text">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="cu-password" className="form-label">Password</label>
        <input id="cu-password" type="password" {...register('password')} placeholder="••••••••"
          className={`input-field pl-4 ${errors.password ? 'input-field-error' : ''}`} />
        {errors.password && <p className="error-text">{errors.password.message}</p>}
        <p className="text-xs text-gray-500 mt-1">Must be ≥8 chars with uppercase, lowercase, digit, & special char</p>
      </div>

      <div>
        <label htmlFor="cu-role" className="form-label">Role</label>
        <select id="cu-role" {...register('role')}
          className="input-field pl-4 cursor-pointer">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">
          Cancel
        </button>
        <button id="create-user-submit" type="submit" disabled={isSubmitting}
          className="flex-1 flex justify-center items-center gap-2 py-2 px-4 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-all duration-200 disabled:opacity-60">
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {isSubmitting ? 'Creating…' : 'Create User'}
        </button>
      </div>
    </form>
  );
}

// ─── Edit User Form ───────────────────────────────────────────────────────────

function EditUserForm({
  user,
  onSuccess,
  onClose,
}: {
  user: User;
  onSuccess: (updated: User) => void;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: user.name, role: user.role, isActive: user.isActive },
  });

  const onSubmit = async (values: EditValues) => {
    setApiError(null);
    try {
      const payload: UpdateUserPayload = values;
      const resultAction = await dispatch(updateUser({ id: user.id, payload }));
      if (updateUser.fulfilled.match(resultAction)) {
        onSuccess(resultAction.payload);
      } else {
        const msg = (resultAction.payload as string) || 'Failed to update user.';
        setApiError(msg);
        toast.error(msg);
      }
    } catch {
      const msg = 'Failed to update user.';
      setApiError(msg);
      toast.error(msg);
    }
  };

  return (
    <form id="edit-user-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {apiError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {apiError}
        </div>
      )}

      <div>
        <label htmlFor="eu-name" className="form-label">Full Name</label>
        <input id="eu-name" {...register('name')}
          className={`input-field pl-4 ${errors.name ? 'input-field-error' : ''}`} />
        {errors.name && <p className="error-text">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="eu-role" className="form-label">Role</label>
        <select id="eu-role" {...register('role')} className="input-field pl-4 cursor-pointer">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <input id="eu-active" type="checkbox" {...register('isActive')}
          className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
        <label htmlFor="eu-active" className="text-sm text-gray-700 font-medium cursor-pointer">
          Active account
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">
          Cancel
        </button>
        <button id="edit-user-submit" type="submit" disabled={isSubmitting}
          className="flex-1 flex justify-center items-center gap-2 py-2 px-4 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-all duration-200 disabled:opacity-60">
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
          {isSubmitting ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  message,
  confirmLabel,
  isDanger,
  isLoading,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  isDanger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">{message}</p>
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Cancel
        </button>
        <button
          id="confirm-action-btn"
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={`flex-1 flex justify-center items-center gap-2 py-2 px-4 text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-60 ${
            isDanger
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-gray-900 text-white hover:bg-gray-700'
          }`}
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Users Table Row ──────────────────────────────────────────────────────────

function UserRow({
  user,
  onEdit,
  onDeactivate,
  onDelete,
}: {
  user: User;
  onEdit: (u: User) => void;
  onDeactivate: (u: User) => void;
  onDelete: (u: User) => void;
}) {
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* Avatar + name + email */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="px-4 py-3 hidden sm:table-cell">
        {user.role === 'admin' ? (
          <span className="badge-admin">{user.role}</span>
        ) : (
          <span className="badge-user">{user.role}</span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3 hidden md:table-cell">
        {user.isActive ? (
          <span className="badge-active">Active</span>
        ) : (
          <span className="badge-inactive">Inactive</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <button
            id={`edit-user-${user.id}`}
            onClick={() => onEdit(user)}
            className="btn-icon"
            title="Edit user"
          >
            <Pencil size={15} />
          </button>
          <button
            id={`deactivate-user-${user.id}`}
            onClick={() => onDeactivate(user)}
            className="btn-icon"
            title={user.isActive ? 'Deactivate user' : 'Activate user'}
          >
            {user.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
          </button>
          <button
            id={`delete-user-${user.id}`}
            onClick={() => onDelete(user)}
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            title="Delete user"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ModalState =
  | { type: 'create' }
  | { type: 'edit'; user: User }
  | { type: 'deactivate'; user: User }
  | { type: 'delete'; user: User }
  | null;

export default function UsersPage() {
  const dispatch = useAppDispatch();
  const { users, isLoading, actionLoading, error: sliceError } = useAppSelector((state) => state.users);
  const [modal, setModal] = useState<ModalState>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Fetch users on mount using Redux thunk ──────────────────────────────
  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  // ── Helpers ─────────────────────────────────────────────────────────────

  const closeModal = () => {
    setModal(null);
    setActionError(null);
  };

  const handleCreated = (newUser: User) => {
    toast.success(`User "${newUser.name}" created successfully`);
    closeModal();
  };

  const handleUpdated = (updatedUser: User) => {
    toast.success(`User "${updatedUser.name}" updated successfully`);
    closeModal();
  };

  const handleDeactivateConfirm = async () => {
    if (modal?.type !== 'deactivate') return;
    const target = modal.user;
    setActionError(null);
    try {
      const resultAction = await dispatch(
        updateUser({ id: target.id, payload: { isActive: !target.isActive } })
      );
      if (updateUser.fulfilled.match(resultAction)) {
        const updated = resultAction.payload;
        toast.success(
          updated.isActive
            ? `User "${updated.name}" activated`
            : `User "${updated.name}" deactivated`
        );
        closeModal();
      } else {
        const msg = (resultAction.payload as string) || 'Action failed. Please try again.';
        setActionError(msg);
        toast.error(msg);
      }
    } catch {
      setActionError('Action failed. Please try again.');
      toast.error('Action failed. Please try again.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (modal?.type !== 'delete') return;
    const target = modal.user;
    setActionError(null);
    try {
      const resultAction = await dispatch(deleteUser(target.id));
      if (deleteUser.fulfilled.match(resultAction)) {
        toast.success(`User "${target.name}" deleted successfully`);
        closeModal();
      } else {
        const msg = (resultAction.payload as string) || 'Failed to delete user.';
        setActionError(msg);
        toast.error(msg);
      }
    } catch {
      setActionError('Failed to delete user.');
      toast.error('Failed to delete user.');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage system users, roles, and access.
          </p>
        </div>
        <button
          id="create-user-btn"
          onClick={() => setModal({ type: 'create' })}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-all duration-200 shrink-0"
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 mb-6">
        {[
          { label: 'Total Users', value: users.length },
          { label: 'Active', value: users.filter((u) => u.isActive).length },
          { label: 'Admins', value: users.filter((u) => u.role === 'admin').length },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl border-2 border-gray-200 hover:border-black px-7 py-8 min-h-[140px] flex flex-col justify-center cursor-pointer transition-all duration-200 hover:shadow-md"
          >
            <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{s.value}</p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 size={22} className="animate-spin" />
            <span className="text-sm">Loading users…</span>
          </div>
        ) : sliceError ? (
          <div className="text-center py-20">
            <p className="text-sm text-red-500">{sliceError}</p>
            <button
              onClick={() => dispatch(fetchUsers())}
              className="mt-3 text-sm text-gray-600 underline hover:text-gray-900"
            >
              Retry
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-gray-500">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onEdit={(u) => setModal({ type: 'edit', user: u })}
                    onDeactivate={(u) => setModal({ type: 'deactivate', user: u })}
                    onDelete={(u) => setModal({ type: 'delete', user: u })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}

      {modal?.type === 'create' && (
        <Modal title="Add New User" onClose={closeModal}>
          <CreateUserForm onSuccess={handleCreated} onClose={closeModal} />
        </Modal>
      )}

      {modal?.type === 'edit' && (
        <Modal title="Edit User" onClose={closeModal}>
          <EditUserForm
            user={modal.user}
            onSuccess={handleUpdated}
            onClose={closeModal}
          />
        </Modal>
      )}

      {modal?.type === 'deactivate' && (
        <Modal
          title={modal.user.isActive ? 'Deactivate User' : 'Activate User'}
          onClose={closeModal}
        >
          {actionError && (
            <p className="text-sm text-red-500 mb-3">{actionError}</p>
          )}
          <ConfirmDialog
            message={
              modal.user.isActive
                ? `Are you sure you want to deactivate ${modal.user.name}? They will lose access immediately.`
                : `Reactivate ${modal.user.name}'s account?`
            }
            confirmLabel={modal.user.isActive ? 'Deactivate' : 'Activate'}
            isDanger={modal.user.isActive}
            isLoading={actionLoading}
            onConfirm={handleDeactivateConfirm}
            onCancel={closeModal}
          />
        </Modal>
      )}

      {modal?.type === 'delete' && (
        <Modal title="Delete User" onClose={closeModal}>
          {actionError && (
            <p className="text-sm text-red-500 mb-3">{actionError}</p>
          )}
          <ConfirmDialog
            message={`Permanently delete ${modal.user.name}? This action cannot be undone.`}
            confirmLabel="Delete"
            isDanger
            isLoading={actionLoading}
            onConfirm={handleDeleteConfirm}
            onCancel={closeModal}
          />
        </Modal>
      )}
    </div>
  );
}
