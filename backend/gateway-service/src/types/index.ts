export interface DeviceInfo {
  deviceId: string;
  serialNumber?: string;
  deviceType?: string;
  firmwareVersion?: string;
  hardwareVersion?: string;
}

export interface HeartbeatPayload {
  timestamp: number;
  status?: string;
  batteryLevel?: number;
  signalStrength?: number;
}

export interface CommandPayload {
  commandId: string;
  commandType: string;
  payload: Record<string, any>;
  idempotencyKey?: string;
  timestamp: number;
}

export interface CommandAckPayload {
  commandId: string;
  status: 'success' | 'failed' | 'timeout';
  payload?: Record<string, any>;
  errorMessage?: string;
  timestamp: number;
}

export interface TelemetryData {
  deviceId: string;
  timestamp: number;
  data: Record<string, any>;
}

export interface DeviceStatus {
  deviceId: string;
  isOnline: boolean;
  lastSeenAt: number;
  status: string;
}

export interface CommandRecord {
  id: string;
  deviceId: string;
  commandType: string;
  payload: Record<string, any>;
  idempotencyKey?: string;
  status: 'pending' | 'sent' | 'acknowledged' | 'failed' | 'timeout';
  sentAt?: Date;
  acknowledgedAt?: Date;
  responsePayload?: Record<string, any>;
  errorMessage?: string;
  createdAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
