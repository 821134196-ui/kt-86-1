import { create } from 'zustand';
import {
  getAlerts,
  acknowledgeAlert,
  resolveAlert,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
} from '@/api/alert';
import type { Alert, Notification, AlertStatus, AlertSeverity } from '@/types';

interface AlertState {
  alerts: Alert[];
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchAlerts: (params?: { status?: AlertStatus; severity?: AlertSeverity; homeId?: string }) => Promise<void>;
  acknowledge: (id: string) => Promise<void>;
  resolve: (id: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  addAlert: (alert: Alert) => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchAlerts: async (params) => {
    set({ loading: true });
    try {
      const alerts = await getAlerts(params);
      set({ alerts, loading: false });
    } catch (error) {
      set({ loading: false });
    }
  },

  acknowledge: async (id) => {
    const alert = await acknowledgeAlert(id);
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? alert : a)),
    }));
  },

  resolve: async (id) => {
    const alert = await resolveAlert(id);
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? alert : a)),
    }));
  },

  fetchNotifications: async () => {
    const notifications = await getNotifications();
    set({ notifications });
  },

  markRead: async (id) => {
    await markNotificationRead(id);
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    await markAllNotificationsRead();
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  fetchUnreadCount: async () => {
    const { count } = await getUnreadCount();
    set({ unreadCount: count });
  },

  addAlert: (alert) => {
    set((state) => ({
      alerts: [alert, ...state.alerts],
      unreadCount: state.unreadCount + 1,
    }));
  },
}));
