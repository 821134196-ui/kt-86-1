import { create } from 'zustand';
import {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  controlDevice,
} from '@/api/device';
import type { Device } from '@/types';

interface DeviceState {
  devices: Device[];
  selectedDevice: Device | null;
  loading: boolean;
  fetchDevices: (params?: { roomId?: string; homeId?: string }) => Promise<void>;
  fetchDevice: (id: string) => Promise<void>;
  addDevice: (data: Partial<Device>) => Promise<void>;
  updateDeviceData: (id: string, data: Partial<Device>) => Promise<void>;
  removeDevice: (id: string) => Promise<void>;
  control: (id: string, state: Record<string, any>) => Promise<void>;
  updateDeviceState: (deviceId: string, state: Record<string, any>) => void;
  setSelectedDevice: (device: Device | null) => void;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  selectedDevice: null,
  loading: false,

  fetchDevices: async (params) => {
    set({ loading: true });
    try {
      const devices = await getDevices(params);
      set({ devices, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  fetchDevice: async (id: string) => {
    set({ loading: true });
    try {
      const device = await getDevice(id);
      set({ selectedDevice: device, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  addDevice: async (data) => {
    const device = await createDevice(data);
    set((state) => ({ devices: [...state.devices, device] }));
  },

  updateDeviceData: async (id, data) => {
    const device = await updateDevice(id, data);
    set((state) => ({
      devices: state.devices.map((d) => (d.id === id ? device : d)),
      selectedDevice: state.selectedDevice?.id === id ? device : state.selectedDevice,
    }));
  },

  removeDevice: async (id) => {
    await deleteDevice(id);
    set((state) => ({
      devices: state.devices.filter((d) => d.id !== id),
      selectedDevice: state.selectedDevice?.id === id ? null : state.selectedDevice,
    }));
  },

  control: async (id, state) => {
    const device = await controlDevice(id, state);
    set((s) => ({
      devices: s.devices.map((d) => (d.id === id ? device : d)),
      selectedDevice: s.selectedDevice?.id === id ? device : s.selectedDevice,
    }));
  },

  updateDeviceState: (deviceId, newState) => {
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId ? { ...d, state: { ...d.state, ...newState } } : d
      ),
      selectedDevice:
        state.selectedDevice?.id === deviceId
          ? { ...state.selectedDevice, state: { ...state.selectedDevice.state, ...newState } }
          : state.selectedDevice,
    }));
  },

  setSelectedDevice: (device) => set({ selectedDevice: device }),
}));
