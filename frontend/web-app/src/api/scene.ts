import axios from 'axios';
import type { Scene } from '@/types';

const ruleApi = axios.create({
  baseURL: import.meta.env.VITE_RULE_ENGINE_URL || 'http://localhost:3004',
  timeout: 10000,
});

ruleApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getScenes = async (homeId?: string): Promise<Scene[]> => {
  const response = await ruleApi.get('/scenes', { params: { homeId } });
  return response.data;
};

export const getScene = async (id: string): Promise<Scene> => {
  const response = await ruleApi.get(`/scenes/${id}`);
  return response.data;
};

export const createScene = async (data: Partial<Scene>): Promise<Scene> => {
  const response = await ruleApi.post('/scenes', data);
  return response.data;
};

export const updateScene = async (id: string, data: Partial<Scene>): Promise<Scene> => {
  const response = await ruleApi.put(`/scenes/${id}`, data);
  return response.data;
};

export const deleteScene = async (id: string): Promise<void> => {
  await ruleApi.delete(`/scenes/${id}`);
};

export const executeScene = async (id: string): Promise<void> => {
  await ruleApi.post(`/scenes/${id}/execute`);
};
