export interface User {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'member' | 'guest';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Home {
  id: string;
  name: string;
  address?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  name: string;
  homeId: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceGroup {
  id: string;
  name: string;
  homeId: string;
  deviceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type DeviceType =
  | 'switch'
  | 'dimmer'
  | 'light'
  | 'thermostat'
  | 'ac'
  | 'curtain'
  | 'lock'
  | 'camera'
  | 'sensor_temp'
  | 'sensor_humidity'
  | 'sensor_motion'
  | 'sensor_door'
  | 'other';

export type DeviceCapability =
  | 'on_off'
  | 'brightness'
  | 'color'
  | 'temperature'
  | 'humidity'
  | 'motion'
  | 'lock_unlock'
  | 'open_close'
  | 'power'
  | 'mode';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  roomId?: string;
  homeId: string;
  capabilities: DeviceCapability[];
  status: 'online' | 'offline' | 'error';
  state: Record<string, any>;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TelemetryData {
  id: string;
  deviceId: string;
  key: string;
  value: number | string | boolean;
  timestamp: string;
}

export interface TelemetryAggregate {
  timestamp: string;
  avg?: number;
  min?: number;
  max?: number;
  count?: number;
}

export type RuleTriggerType = 'device_state' | 'schedule' | 'geofence' | 'manual';

export interface RuleTrigger {
  id: string;
  type: RuleTriggerType;
  config: {
    deviceId?: string;
    capability?: string;
    operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte';
    value?: any;
    cron?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
  };
}

export type RuleConditionOperator = 'and' | 'or';

export interface RuleCondition {
  id: string;
  operator: RuleConditionOperator;
  conditions?: RuleCondition[];
  deviceId?: string;
  capability?: string;
  comparison?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte';
  value?: any;
  timeStart?: string;
  timeEnd?: string;
}

export type RuleActionType =
  | 'device_control'
  | 'scene'
  | 'notification'
  | 'delay';

export interface RuleAction {
  id: string;
  type: RuleActionType;
  order: number;
  config: {
    deviceId?: string;
    state?: Record<string, any>;
    sceneId?: string;
    notificationType?: 'push' | 'sms' | 'email';
    message?: string;
    delayMs?: number;
  };
}

export interface Rule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  homeId: string;
  trigger: RuleTrigger;
  conditions?: RuleCondition;
  actions: RuleAction[];
  createdAt: string;
  updatedAt: string;
}

export interface SceneAction {
  id: string;
  deviceId: string;
  state: Record<string, any>;
  order: number;
}

export interface Scene {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  homeId: string;
  actions: SceneAction[];
  createdAt: string;
  updatedAt: string;
  lastExecuted?: string;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  type: string;
  severity: AlertSeverity;
  deviceId?: string;
  homeId: string;
  message: string;
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'alert' | 'system' | 'info';
  title: string;
  message: string;
  read: boolean;
  alertId?: string;
  createdAt: string;
}
