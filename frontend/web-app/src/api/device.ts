import deviceApi from './index';
import type { Device } from '@/types';

export const getDevices = async (params?: { roomId?: string; homeId?: string }): Promise<Device[]> => {
  const response = await deviceApi.get('/devices', { params });
  return response.data;
};

export const getDevice = async (id: string): Promise<Device> => {
  const response = await deviceApi.get(`/devices/${id}`);
  return response.data;
};

export const createDevice = async (data: Partial<Device>): Promise<Device> => {
  const response = await deviceApi.post('/devices', data);
  return response.data;
};

export const updateDevice = async (id: string, data: Partial<Device>): Promise<Device> => {
  const response = await deviceApi.put(`/devices/${id}`, data);
  return response.data;
};

export const deleteDevice = async (id: string): Promise<void> => {
  await deviceApi.delete(`/devices/${id}`);
};

export const controlDevice = async (id: string, state: Record<string, any>): Promise<Device> => {
  const response = await deviceApi.post(`/devices/${id}/control`, { state });
  return response.data;
};

export const assignDeviceToRoom = async (deviceId: string, roomId: string | null): Promise<Device> => {
  const response = await deviceApi.put(`/devices/${deviceId}`, { roomId });
  return response.data;
};
