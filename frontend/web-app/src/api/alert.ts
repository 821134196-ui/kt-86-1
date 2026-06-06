import axios from 'axios';
import type { Alert, Notification, AlertStatus, AlertSeverity } from '@/types';

const alertApi = axios.create({
  baseURL: import.meta.env.VITE_ALERT_SERVICE_URL || 'http://localhost:3005',
  timeout: 10000,
});

alertApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getAlerts = async (params?: {
  status?: AlertStatus;
  severity?: AlertSeverity;
  homeId?: string;
}): Promise<Alert[]> => {
  const response = await alertApi.get('/alerts', { params });
  return response.data;
};

export const getAlert = async (id: string): Promise<Alert> => {
  const response = await alertApi.get(`/alerts/${id}`);
  return response.data;
};

export const acknowledgeAlert = async (id: string): Promise<Alert> => {
  const response = await alertApi.post(`/alerts/${id}/acknowledge`);
  return response.data;
};

export const resolveAlert = async (id: string): Promise<Alert> => {
  const response = await alertApi.post(`/alerts/${id}/resolve`);
  return response.data;
};

export const getNotifications = async (): Promise<Notification[]> => {
  const response = await alertApi.get('/notifications');
  return response.data;
};

export const markNotificationRead = async (id: string): Promise<void> => {
  await alertApi.put(`/notifications/${id}/read`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await alertApi.put('/notifications/read-all');
};

export const getUnreadCount = async (): Promise<{ count: number }> => {
  const response = await alertApi.get('/notifications/unread-count');
  return response.data;
};
