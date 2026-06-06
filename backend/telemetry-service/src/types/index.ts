export interface TelemetryData {
  deviceId: string;
  capability: string;
  value: number;
  timestamp: Date;
}

export interface TelemetryRecord extends TelemetryData {
  id?: string;
}

export interface DeviceLatestState {
  deviceId: string;
  capabilities: Record<string, { value: number; timestamp: Date }>;
  updatedAt: Date;
}

export interface ThresholdConfig {
  deviceId: string;
  capability: string;
  min?: number;
  max?: number;
  enabled: boolean;
}

export interface ThresholdAlert {
  id?: string;
  deviceId: string;
  capability: string;
  value: number;
  thresholdType: 'min' | 'max';
  thresholdValue: number;
  timestamp: Date;
  acknowledged: boolean;
}

export interface AggregatedTelemetry {
  deviceId: string;
  capability: string;
  timeBucket: Date;
  avg: number;
  min: number;
  max: number;
  count: number;
  first: number;
  last: number;
}

export type AggregationLevel = 'raw' | '1m' | '1h' | '1d';

export interface TelemetryQueryParams {
  deviceId: string;
  from: Date;
  to: Date;
  capability?: string;
  aggregation: AggregationLevel;
}

export interface WebSocketMessage {
  type: 'telemetry' | 'alert' | 'subscribe' | 'unsubscribe';
  data: unknown;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    timescaledb: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
    mqtt: 'healthy' | 'unhealthy';
  };
}
