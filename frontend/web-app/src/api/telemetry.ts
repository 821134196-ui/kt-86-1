import axios from 'axios';
import type { TelemetryData, TelemetryAggregate } from '@/types';

const telemetryApi = axios.create({
  baseURL: import.meta.env.VITE_TELEMETRY_API_URL || 'http://localhost:3003',
  timeout: 10000,
});

telemetryApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getLatestTelemetry = async (deviceId: string): Promise<TelemetryData[]> => {
  const response = await telemetryApi.get(`/telemetry/${deviceId}/latest`);
  return response.data;
};

export const getTelemetryHistory = async (
  deviceId: string,
  key: string,
  params: { startTime: string; endTime: string; interval?: string }
): Promise<TelemetryAggregate[]> => {
  const response = await telemetryApi.get(`/telemetry/${deviceId}/${key}/history`, { params });
  return response.data;
};

export const getTelemetryRealtime = async (deviceIds: string[]): Promise<TelemetryData[]> => {
  const response = await telemetryApi.post('/telemetry/realtime', { deviceIds });
  return response.data;
};
