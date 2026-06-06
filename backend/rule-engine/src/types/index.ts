export type TriggerType = 'device_state' | 'schedule' | 'geofence';

export type Operator = '>' | '<' | '>=' | '<=' | '==' | '!=' | 'in' | 'not_in';

export interface DeviceStateTrigger {
  type: 'device_state';
  deviceId: string;
  capability: string;
  operator: Operator;
  value: any;
}

export interface ScheduleTrigger {
  type: 'schedule';
  cron: string;
}

export interface GeofenceTrigger {
  type: 'geofence';
  geofenceId: string;
  action: 'enter' | 'leave';
}

export type Trigger = DeviceStateTrigger | ScheduleTrigger | GeofenceTrigger;

export type ConditionType = 'device_state' | 'time_range' | 'custom';

export type LogicOperator = 'AND' | 'OR';

export interface DeviceStateCondition {
  type: 'device_state';
  deviceId: string;
  capability: string;
  operator: Operator;
  value: any;
}

export interface TimeRangeCondition {
  type: 'time_range';
  from: string;
  to: string;
  timezone?: string;
}

export interface ConditionGroup {
  logic: LogicOperator;
  conditions: (DeviceStateCondition | TimeRangeCondition | ConditionGroup)[];
}

export type Condition = ConditionGroup;

export type ActionType = 'device_command' | 'scene' | 'notification' | 'delay';

export interface DeviceCommandAction {
  type: 'device_command';
  deviceId: string;
  command: string;
  payload: Record<string, any>;
}

export interface SceneAction {
  type: 'scene';
  sceneId: string;
}

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';

export interface NotificationAction {
  type: 'notification';
  channel: NotificationChannel;
  message: string;
  title?: string;
  userId?: string;
}

export interface DelayAction {
  type: 'delay';
  delayMs: number;
}

export type Action = DeviceCommandAction | SceneAction | NotificationAction | DelayAction;

export interface Rule {
  id: string;
  homeId: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  priority: number;
  triggerConfig: Trigger;
  conditionConfig: Condition | null;
  actionConfig: Action[];
  debounceMs: number;
  lastTriggeredAt?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type RuleStatus = 'success' | 'failed' | 'skipped';

export interface RuleExecutionLog {
  id: string;
  ruleId: string;
  triggerData: Record<string, any>;
  conditionResult: boolean | null;
  actionsExecuted: Record<string, any>[];
  status: RuleStatus;
  errorMessage?: string;
  executionTimeMs: number;
  createdAt: Date;
}

export interface SceneActionItem {
  id?: string;
  deviceId: string;
  actionType: string;
  payload: Record<string, any>;
  delayMs: number;
  sortOrder: number;
}

export interface Scene {
  id: string;
  homeId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isEnabled: boolean;
  sortOrder: number;
  actions: SceneActionItem[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRuleInput {
  homeId: string;
  name: string;
  description?: string;
  isEnabled?: boolean;
  priority?: number;
  triggerConfig: Trigger;
  conditionConfig?: Condition;
  actionConfig: Action[];
  debounceMs?: number;
  createdBy?: string;
}

export interface UpdateRuleInput {
  name?: string;
  description?: string;
  isEnabled?: boolean;
  priority?: number;
  triggerConfig?: Trigger;
  conditionConfig?: Condition | null;
  actionConfig?: Action[];
  debounceMs?: number;
}

export interface CreateSceneInput {
  homeId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isEnabled?: boolean;
  sortOrder?: number;
  actions: Omit<SceneActionItem, 'id'>[];
  createdBy?: string;
}

export interface UpdateSceneInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  isEnabled?: boolean;
  sortOrder?: number;
  actions?: Omit<SceneActionItem, 'id'>[];
}
