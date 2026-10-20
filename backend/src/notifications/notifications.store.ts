export interface StoredNotification {
  id: string;
  action: "ASSIGNED" | "UPDATED" | "COMPLETED" | "REORDERED" | "DELETED" | "CREATED" | "PROJECT_ASSIGNED" | "PROJECT_CREATED";
  taskId?: number;
  taskTitle?: string;
  projectId?: number;
  projectName?: string;
  message: string;
  updatedBy: {
    id: number;
    name: string;
  };
  recipientUserIds?: number[];
  createdAt: string;
  readByUserIds: number[];
}

// In-memory persistent buffer for notifications
const notificationsStore: StoredNotification[] = [];

export function addNotification(notification: Omit<StoredNotification, "id" | "createdAt" | "readByUserIds">): StoredNotification {
  const item: StoredNotification = {
    ...notification,
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
    readByUserIds: [],
  };

  notificationsStore.unshift(item);

  // Keep last 200 notifications
  if (notificationsStore.length > 200) {
    notificationsStore.pop();
  }

  return item;
}

export function getNotificationsForUser(user: { id: number; role: string }): Array<StoredNotification & { isRead: boolean }> {
  return notificationsStore
    .filter((n) => {
      // Don't show notifications to the user who triggered the action
      if (Number(n.updatedBy.id) === Number(user.id)) {
        return false;
      }

      // If user is admin, they receive notifications
      if (user.role === "ADMIN") {
        return true;
      }

      // If recipients specified, check if user is targeted
      if (n.recipientUserIds && n.recipientUserIds.length > 0) {
        return n.recipientUserIds.includes(user.id);
      }

      return true;
    })
    .map((n) => ({
      ...n,
      isRead: n.readByUserIds.includes(user.id),
    }));
}

export function markNotificationAsRead(user: { id: number }, notificationId: string): void {
  const item = notificationsStore.find((n) => n.id === notificationId);
  if (item && !item.readByUserIds.includes(user.id)) {
    item.readByUserIds.push(user.id);
  }
}

export function markAllNotificationsAsRead(user: { id: number }): void {
  notificationsStore.forEach((n) => {
    if (!n.readByUserIds.includes(user.id)) {
      n.readByUserIds.push(user.id);
    }
  });
}
