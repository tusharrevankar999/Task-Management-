import {
  FolderKanban,
  ListTodo,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/useAuth';

// ─── Nav items ───────────────────────────────────────────────────────────────

function NavItems({ onClick }: { onClick?: () => void }) {
  const { user } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-gray-900 text-white'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`;

  return (
    <nav className="flex flex-col gap-1">
      <NavLink to="/dashboard" className={linkClass} onClick={onClick}>
        <LayoutDashboard size={18} />
        Dashboard
      </NavLink>

      <NavLink to="/projects" className={linkClass} onClick={onClick}>
        <FolderKanban size={18} />
        Projects
      </NavLink>

      <NavLink to="/tasks" className={linkClass} onClick={onClick}>
        <ListTodo size={18} />
        Tasks
      </NavLink>

      {user?.role === 'admin' && (
        <NavLink to="/admin/users" className={linkClass} onClick={onClick}>
          <Users size={18} />
          User Management
        </NavLink>
      )}
    </nav>
  );
}

// ─── Layout shell ────────────────────────────────────────────────────────────

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Mobile sidebar overlay ──────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200
          flex flex-col transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-base tracking-tight">
              Project Management
            </span>
          </div>
          {/* Close button on mobile */}
          <button
            id="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            className="btn-icon md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4">
          <NavItems onClick={() => setSidebarOpen(false)} />
        </div>

        {/* User info at bottom */}
        <div className="px-4 pb-4 border-t border-gray-200 pt-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="btn-icon shrink-0"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
          {user?.role === 'admin' && (
            <span className="badge-admin mt-2">Admin</span>
          )}
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center gap-4 px-4 md:px-6 shrink-0">
          {/* Hamburger – mobile only */}
          <button
            id="sidebar-open"
            onClick={() => setSidebarOpen(true)}
            className="btn-icon md:hidden"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1" />

          {/* Role badge in header */}
          {user?.role === 'admin' ? (
            <span className="badge-admin hidden sm:inline-flex">Admin</span>
          ) : (
            <span className="badge-user hidden sm:inline-flex">User</span>
          )}

          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-semibold">
            {initials}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
