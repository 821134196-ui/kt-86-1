export type AlertType = 'device_offline' | 'threshold_exceeded' | 'rule_execution_failed' | 'device_error';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface Alert {
  id: string;
  home_id: string;
  device_id?: string;
  rule_id?: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  message?: string;
  payload?: Record<string, any>;
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: Date;
  resolved_at?: Date;
  created_at: Date;
}

export interface CreateAlertRequest {
  homeId: string;
  deviceId?: string;
  ruleId?: string;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  message?: string;
  payload?: Record<string, any>;
}

export interface AlertListQuery {
  homeId?: string;
  status?: 'active' | 'acknowledged' | 'resolved';
  severity?: AlertSeverity;
  type?: AlertType;
  page?: number;
  pageSize?: number;
}

export interface AlertStatistics {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  bySeverity: Record<AlertSeverity, number>;
  byType: Record<AlertType, number>;
  todayCount: number;
}

export type NotificationChannel = 'in_app' | 'email' | 'sms';

export interface Notification {
  id: string;
  user_id: string;
  alert_id?: string;
  title: string;
  message?: string;
  channel: NotificationChannel;
  is_read: boolean;
  read_at?: Date;
  created_at: Date;
}

export interface CreateNotificationRequest {
  userId: string;
  alertId?: string;
  title: string;
  message?: string;
  channel?: NotificationChannel;
}

export interface NotificationListQuery {
  userId: string;
  isRead?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface WebSocketMessage {
  type: 'alert' | 'notification' | 'ping';
  data: Alert | Notification | { timestamp: number };
}
