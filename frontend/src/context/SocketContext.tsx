import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { CheckCircle2, UserCheck, RefreshCw, ArrowUpDown, Trash2, FolderPlus } from 'lucide-react';
import { useAuth } from './useAuth';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { notificationsApi } from '../lib/api';
import { useAppDispatch } from '../store/hooks';
import {
  onTaskCreatedOrAssigned,
  onTaskUpdated,
  onTaskDeleted,
  onTasksReordered,
} from '../store/features/tasks/tasksSlice';
import { fetchProjects } from '../store/features/projects/projectsSlice';

export interface NotificationItem {
  id: string;
  action: 'ASSIGNED' | 'UPDATED' | 'COMPLETED' | 'REORDERED' | 'DELETED' | 'CREATED' | 'PROJECT_ASSIGNED' | 'PROJECT_CREATED';
  taskId?: number;
  taskTitle?: string;
  projectId?: number;
  projectName?: string;
  message: string;
  updatedBy: {
    id: number;
    name: string;
  };
  timestamp: string;
  isRead: boolean;
}

export interface TaskNotificationPayload {
  id?: string;
  action: 'ASSIGNED' | 'UPDATED' | 'COMPLETED' | 'REORDERED' | 'DELETED' | 'CREATED' | 'PROJECT_ASSIGNED' | 'PROJECT_CREATED';
  taskId?: number;
  taskTitle?: string;
  projectId?: number;
  projectName?: string;
  message: string;
  updatedBy: {
    id: number;
    name: string;
  };
  task?: any;
  project?: any;
  reorderedTaskIds?: number[];
  recipientUserIds?: number[];
  createdAt?: string;
}

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearNotifications: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const dispatch = useAppDispatch();
  const [isConnected, setIsConnected] = useState(false);
  const [activeSocket, setActiveSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Fetch persisted notifications whenever user logs in
  useEffect(() => {
    if (!token || !user) {
      setNotifications([]);
      return;
    }

    notificationsApi
      .list()
      .then(({ data }) => {
        if (Array.isArray(data.data)) {
          const formatted: NotificationItem[] = data.data.map((item: any) => ({
            id: item.id,
            action: item.action,
            taskId: item.taskId,
            taskTitle: item.taskTitle,
            projectId: item.projectId,
            projectName: item.projectName,
            message: item.message,
            updatedBy: item.updatedBy,
            timestamp: new Date(item.createdAt || Date.now()).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isRead: Boolean(item.isRead),
          }));
          setNotifications(formatted);
        }
      })
      .catch((err) => {
        console.error('Failed to load initial notifications:', err);
      });
  }, [token, user]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    notificationsApi.markAsRead(id).catch(() => {});
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    notificationsApi.markAllAsRead().catch(() => {});
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  useEffect(() => {
    if (!token || !user) {
      disconnectSocket();
      setActiveSocket(null);
      setIsConnected(false);
      return;
    }

    const s = connectSocket(token);
    setActiveSocket(s);

    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const handleTaskNotification = (payload: TaskNotificationPayload) => {
      const isSelf = Number(payload.updatedBy?.id) === Number(user.id);

      // 1. Update Redux task or project state in real-time
      if (payload.action === 'CREATED' || payload.action === 'ASSIGNED') {
        if (payload.task) {
          dispatch(onTaskCreatedOrAssigned(payload.task));
        }
      } else if (payload.action === 'COMPLETED' || payload.action === 'UPDATED') {
        if (payload.task) {
          dispatch(onTaskUpdated(payload.task));
        }
      } else if (payload.action === 'DELETED') {
        if (payload.taskId) {
          dispatch(onTaskDeleted({ taskId: payload.taskId, projectId: payload.projectId }));
        }
      } else if (payload.action === 'REORDERED') {
        if (payload.reorderedTaskIds) {
          dispatch(onTasksReordered({ taskIds: payload.reorderedTaskIds, projectId: payload.projectId }));
        }
      } else if (payload.action === 'PROJECT_ASSIGNED' || payload.action === 'PROJECT_CREATED') {
        dispatch(fetchProjects());
      }

      // 2. Suppress alerts for the user who initiated the action
      if (isSelf) {
        return;
      }

      // Check if user is recipient (if recipient list is specified and user is not admin)
      if (
        user.role !== 'admin' &&
        payload.recipientUserIds &&
        payload.recipientUserIds.length > 0 &&
        !payload.recipientUserIds.includes(user.id)
      ) {
        return;
      }

      const newNotification: NotificationItem = {
        id: payload.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        action: payload.action,
        taskId: payload.taskId,
        taskTitle: payload.taskTitle,
        projectId: payload.projectId,
        projectName: payload.projectName,
        message: payload.message,
        updatedBy: payload.updatedBy,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRead: false,
      };

      setNotifications((prev) => [newNotification, ...prev]);

      // Display real-time Toast Notification
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-white shadow-xl rounded-xl pointer-events-auto flex ring-1 ring-black/10 p-4 border-l-4 ${
              payload.action === 'COMPLETED'
                ? 'border-emerald-500'
                : payload.action === 'ASSIGNED' || payload.action === 'PROJECT_ASSIGNED'
                ? 'border-blue-500'
                : payload.action === 'REORDERED'
                ? 'border-indigo-500'
                : payload.action === 'DELETED'
                ? 'border-rose-500'
                : 'border-amber-500'
            }`}
          >
            <div className="flex-1 w-0">
              <div className="flex items-start">
                <div className="shrink-0 pt-0.5">
                  {payload.action === 'COMPLETED' && (
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  )}
                  {(payload.action === 'ASSIGNED' || payload.action === 'PROJECT_ASSIGNED') && (
                    <UserCheck className="h-6 w-6 text-blue-500" />
                  )}
                  {payload.action === 'REORDERED' && (
                    <ArrowUpDown className="h-6 w-6 text-indigo-500" />
                  )}
                  {payload.action === 'DELETED' && (
                    <Trash2 className="h-6 w-6 text-rose-500" />
                  )}
                  {payload.action === 'PROJECT_CREATED' && (
                    <FolderPlus className="h-6 w-6 text-indigo-500" />
                  )}
                  {(payload.action === 'UPDATED' || payload.action === 'CREATED') && (
                    <RefreshCw className="h-6 w-6 text-amber-500" />
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {payload.action === 'COMPLETED' && 'Task Completed'}
                    {payload.action === 'ASSIGNED' && 'Task Assigned'}
                    {payload.action === 'PROJECT_ASSIGNED' && 'Project Assigned'}
                    {payload.action === 'PROJECT_CREATED' && 'New Project'}
                    {payload.action === 'REORDERED' && 'Tasks Reordered'}
                    {payload.action === 'DELETED' && 'Task Deleted'}
                    {payload.action === 'UPDATED' && 'Updated'}
                    {payload.action === 'CREATED' && 'New Task Created'}
                  </p>
                  <p className="mt-1 text-sm text-gray-600 leading-snug">
                    {payload.message}
                  </p>
                  <p className="mt-1.5 text-xs text-gray-400">
                    By {payload.updatedBy?.name || 'team member'}
                    {payload.projectName && payload.action !== 'PROJECT_ASSIGNED' ? ` • ${payload.projectName}` : ''}
                  </p>
                </div>
              </div>
            </div>
            <div className="ml-4 flex shrink-0 items-center">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <span className="sr-only">Close</span>
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>
          </div>
        ),
        {
          duration: 4500,
          position: 'top-right',
        }
      );
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('task:notification', handleTaskNotification);

    if (s.connected) {
      setIsConnected(true);
    }

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('task:notification', handleTaskNotification);
    };
  }, [token, user, dispatch]);

  return (
    <SocketContext.Provider
      value={{
        socket: activeSocket,
        isConnected,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
