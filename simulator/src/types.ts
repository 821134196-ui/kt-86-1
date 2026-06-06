export enum DeviceType {
  SWITCH = 'switch',
  DIMMER = 'dimmer',
  TEMPERATURE_HUMIDITY = 'temperature_humidity',
  LOCK = 'lock',
  CAMERA = 'camera',
  CURTAIN = 'curtain',
  AIR_CONDITIONER = 'air_conditioner',
  MOTION_SENSOR = 'motion_sensor'
}

export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  ERROR = 'error'
}

export interface DeviceConfig {
  id: string;
  name: string;
  type: DeviceType;
  room: string;
}

export interface TelemetryData {
  timestamp: number;
  [key: string]: any;
}

export interface Command {
  id: string;
  action: string;
  params?: Record<string, any>;
  timestamp: number;
}

export interface CommandAck {
  commandId: string;
  success: boolean;
  message?: string;
  timestamp: number;
}

export interface RegisterPayload {
  deviceId: string;
  name: string;
  type: DeviceType;
  room: string;
  capabilities: string[];
}

export interface HeartbeatPayload {
  deviceId: string;
  status: DeviceStatus;
  timestamp: number;
  uptime: number;
}
