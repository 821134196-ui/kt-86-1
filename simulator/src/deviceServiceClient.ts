import axios from 'axios';
import { DEVICE_SERVICE_URL } from './config';
import { DeviceType, RegisterPayload } from './types';

export class DeviceServiceClient {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = DEVICE_SERVICE_URL;
  }

  async registerDevice(payload: RegisterPayload): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/api/devices`, payload, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`[DeviceService] Device ${payload.deviceId} registered successfully`);
    } catch (err: any) {
      if (err.response && err.response.status === 409) {
        console.log(`[DeviceService] Device ${payload.deviceId} already exists`);
      } else {
        console.warn(`[DeviceService] Register ${payload.deviceId} failed: ${err.message}`);
      }
    }
  }

  async getDevice(deviceId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/devices/${deviceId}`, {
        timeout: 10000
      });
      return response.data;
    } catch (err: any) {
      console.warn(`[DeviceService] Get device ${deviceId} failed: ${err.message}`);
      return null;
    }
  }

  async updateDeviceStatus(deviceId: string, status: string): Promise<void> {
    try {
      await axios.patch(
        `${this.baseUrl}/api/devices/${deviceId}/status`,
        { status },
        {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (err: any) {
      console.warn(`[DeviceService] Update status ${deviceId} failed: ${err.message}`);
    }
  }
}

export const deviceServiceClient = new DeviceServiceClient();
