import deviceApi from './index';
import type { Device, Room, Home, DeviceGroup } from '@/types';

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await deviceApi.post('/auth/login', { email, password });
  return response.data;
};

export const register = async (data: { email: string; password: string; username: string }) => {
  const response = await deviceApi.post('/auth/register', data);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await deviceApi.get('/auth/me');
  return response.data;
};

export const getHomes = async (): Promise<Home[]> => {
  const response = await deviceApi.get('/homes');
  return response.data;
};

export const getRooms = async (homeId: string): Promise<Room[]> => {
  const response = await deviceApi.get(`/homes/${homeId}/rooms`);
  return response.data;
};

export const createRoom = async (homeId: string, name: string): Promise<Room> => {
  const response = await deviceApi.post(`/homes/${homeId}/rooms`, { name });
  return response.data;
};

export const updateRoom = async (roomId: string, name: string): Promise<Room> => {
  const response = await deviceApi.put(`/rooms/${roomId}`, { name });
  return response.data;
};

export const deleteRoom = async (roomId: string): Promise<void> => {
  await deviceApi.delete(`/rooms/${roomId}`);
};

export const getDeviceGroups = async (homeId: string): Promise<DeviceGroup[]> => {
  const response = await deviceApi.get(`/homes/${homeId}/groups`);
  return response.data;
};
