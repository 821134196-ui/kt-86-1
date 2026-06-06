import axios from 'axios';
import type { Rule } from '@/types';

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

export const getRules = async (homeId?: string): Promise<Rule[]> => {
  const response = await ruleApi.get('/rules', { params: { homeId } });
  return response.data;
};

export const getRule = async (id: string): Promise<Rule> => {
  const response = await ruleApi.get(`/rules/${id}`);
  return response.data;
};

export const createRule = async (data: Partial<Rule>): Promise<Rule> => {
  const response = await ruleApi.post('/rules', data);
  return response.data;
};

export const updateRule = async (id: string, data: Partial<Rule>): Promise<Rule> => {
  const response = await ruleApi.put(`/rules/${id}`, data);
  return response.data;
};

export const deleteRule = async (id: string): Promise<void> => {
  await ruleApi.delete(`/rules/${id}`);
};

export const toggleRule = async (id: string, enabled: boolean): Promise<Rule> => {
  const response = await ruleApi.put(`/rules/${id}`, { enabled });
  return response.data;
};
