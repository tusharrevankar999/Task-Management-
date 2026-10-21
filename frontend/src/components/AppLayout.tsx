import {
  FolderKanban,
  ListTodo,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Users,
  X,
  Wifi,
  WifiOff,
  Bell,
  CheckCircle2,
  UserCheck,
  RefreshCw,
  ArrowUpDown,
  Trash2,
  Check,
  FolderPlus,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/useAuth';
import { useSocket } from '../context/SocketContext';

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
  const {
    isConnected,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useSocket();

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setBellOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'COMPLETED':
        return <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />;
      case 'ASSIGNED':
      case 'PROJECT_ASSIGNED':
        return <UserCheck size={16} className="text-blue-500 shrink-0" />;
      case 'PROJECT_CREATED':
        return <FolderPlus size={16} className="text-indigo-500 shrink-0" />;
      case 'REORDERED':
        return <ArrowUpDown size={16} className="text-indigo-500 shrink-0" />;
      case 'DELETED':
        return <Trash2 size={16} className="text-rose-500 shrink-0" />;
      default:
        return <RefreshCw size={16} className="text-amber-500 shrink-0" />;
    }
  };

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
        <header className="h-16 bg-white border-b border-gray-200 flex items-center gap-3 px-4 md:px-6 shrink-0 relative">
          {/* Hamburger – mobile only */}
          <button
            id="sidebar-open"
            onClick={() => setSidebarOpen(true)}
            className="btn-icon md:hidden"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1" />

          {/* Real-time Connection Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
            title={isConnected ? 'Live real-time socket connected' : 'Connecting to live updates...'}
          >
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Wifi size={13} className="text-emerald-600 hidden sm:inline" />
                <span>Live</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <WifiOff size={13} className="text-amber-600 hidden sm:inline" />
                <span>Connecting</span>
              </>
            )}
          </div>

          {/* Notification Bell Dropdown */}
          <div className="relative" ref={bellRef}>
            <button
              id="notification-bell-btn"
              onClick={() => setBellOpen(!bellOpen)}
              className="relative p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none"
              title="Notifications"
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 text-[11px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-white animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Menu Popup */}
            {bellOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full font-medium">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        title="Mark all as read"
                      >
                        <Check size={12} />
                        Read all
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={clearNotifications}
                        className="text-xs text-gray-400 hover:text-gray-600"
                        title="Clear all"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Notification Items List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell size={28} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500 font-medium">No notifications yet</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Real-time updates will appear here.
                      </p>
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => markAsRead(item.id)}
                        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-start gap-3 transition-colors ${
                          !item.isRead ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <div className="mt-0.5">{getActionIcon(item.action)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">
                            {item.action === 'COMPLETED' && 'Task Completed'}
                            {item.action === 'ASSIGNED' && 'Task Assigned'}
                            {item.action === 'PROJECT_ASSIGNED' && 'Project Assigned'}
                            {item.action === 'PROJECT_CREATED' && 'New Project'}
                            {item.action === 'REORDERED' && 'Tasks Reordered'}
                            {item.action === 'DELETED' && 'Deleted'}
                            {item.action === 'UPDATED' && 'Updated'}
                            {item.action === 'CREATED' && 'New Task Created'}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5 leading-snug break-words">
                            {item.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-400">{item.timestamp}</span>
                            {item.projectName && item.action !== 'PROJECT_ASSIGNED' && (
                              <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded font-medium truncate max-w-[120px]">
                                {item.projectName}
                              </span>
                            )}
                          </div>
                        </div>
                        {!item.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Role badge in header */}
          {user?.role === 'admin' ? (
            <span className="badge-admin hidden sm:inline-flex">Admin</span>
          ) : (
            <span className="badge-user hidden sm:inline-flex">User</span>
          )}

          {/* Avatar & User Details Dropdown */}
          <div className="relative" ref={avatarRef}>
            <button
              id="user-avatar-btn"
              onClick={() => setAvatarOpen(!avatarOpen)}
              className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-semibold hover:ring-2 hover:ring-gray-900/30 transition-all focus:outline-none cursor-pointer"
              title="Account details"
            >
              {initials}
            </button>

            {avatarOpen && (
              <div className="absolute right-0 mt-2.5 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* Active Session badge */}
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-emerald-700 bg-emerald-50 tracking-wider uppercase">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active Session
                  </span>
                </div>

                {/* User avatar + name + email */}
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                  <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center text-white text-base font-bold shrink-0 shadow-sm">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 text-sm truncate">
                      {user?.name ?? 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {user?.email ?? '—'}
                    </p>
                  </div>
                </div>

                {/* Details list */}
                <div className="py-3.5 space-y-2.5 text-xs border-b border-gray-100 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Role</span>
                    <span className="font-semibold text-gray-900 capitalize">
                      {user?.role === 'admin' ? 'Administrator' : 'Standard User'}
                    </span>
                  </div>
                </div>

                {/* Log Out button */}
                <button
                  onClick={() => {
                    setAvatarOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-rose-50 hover:bg-rose-100/90 text-rose-600 font-bold text-sm rounded-full transition-all duration-200 cursor-pointer active:scale-[0.98]"
                >
                  <LogOut size={16} />
                  <span>Log Out</span>
                </button>
              </div>
            )}
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
