import logger from '../utils/logger';
import { config } from '../config';
import { DeviceStatus, HeartbeatPayload } from '../types';
import db from '../services/database';
import mqttService, { MqttMessage } from '../services/mqtt';
import axios from 'axios';

class DeviceStatusManager {
  private deviceStatusMap: Map<string, DeviceStatus> = new Map();
  private heartbeatCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupMqttListeners();
    this.startHeartbeatCheck();
  }

  private setupMqttListeners(): void {
    mqttService.on('register', this.handleDeviceRegister.bind(this));
    mqttService.on('heartbeat', this.handleHeartbeat.bind(this));
  }

  private async handleDeviceRegister(message: MqttMessage): Promise<void> {
    try {
      const { deviceId, payload } = message;
      if (!deviceId) return;

      const registerData = JSON.parse(payload.toString());
      logger.info(`Device registration request received: ${deviceId}`, registerData);

      await this.upsertDevice(deviceId, registerData);
      await this.setDeviceOnline(deviceId);

      logger.info(`Device ${deviceId} registered successfully`);
    } catch (error) {
      logger.error('Error handling device registration:', error);
    }
  }

  private async handleHeartbeat(message: MqttMessage): Promise<void> {
    try {
      const { deviceId, payload } = message;
      if (!deviceId) return;

      let heartbeatData: HeartbeatPayload;
      try {
        heartbeatData = JSON.parse(payload.toString());
      } catch {
        heartbeatData = { timestamp: Date.now() };
      }

      await this.updateHeartbeat(deviceId, heartbeatData);
    } catch (error) {
      logger.error('Error handling heartbeat:', error);
    }
  }

  private startHeartbeatCheck(): void {
    this.heartbeatCheckInterval = setInterval(() => {
      this.checkOfflineDevices();
    }, 10000);
  }

  private checkOfflineDevices(): void {
    const now = Date.now();
    const timeoutMs = config.heartbeatTimeout;

    for (const [deviceId, status] of this.deviceStatusMap.entries()) {
      if (status.isOnline && now - status.lastSeenAt > timeoutMs) {
        this.setDeviceOffline(deviceId);
      }
    }
  }

  async upsertDevice(deviceId: string, deviceData: Record<string, any>): Promise<void> {
    try {
      await db.query(
        `INSERT INTO devices (id, serial_number, firmware_version, hardware_version, status, is_online, last_seen_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'online', true, NOW(), NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           firmware_version = COALESCE($3, devices.firmware_version),
           hardware_version = COALESCE($4, devices.hardware_version),
           updated_at = NOW()`,
        [
          deviceId,
          deviceData.serialNumber || null,
          deviceData.firmwareVersion || null,
          deviceData.hardwareVersion || null,
        ]
      );

      await this.notifyDeviceService(deviceId, deviceData);
    } catch (error) {
      logger.error(`Error upserting device ${deviceId}:`, error);
      throw error;
    }
  }

  async setDeviceOnline(deviceId: string): Promise<void> {
    logger.info(`Device ${deviceId} is now online`);

    this.deviceStatusMap.set(deviceId, {
      deviceId,
      isOnline: true,
      lastSeenAt: Date.now(),
      status: 'online',
    });

    try {
      await db.query(
        `UPDATE devices SET status = 'online', is_online = true, last_seen_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [deviceId]
      );
    } catch (error) {
      logger.error(`Error updating device online status for ${deviceId}:`, error);
    }
  }

  async setDeviceOffline(deviceId: string): Promise<void> {
    logger.info(`Device ${deviceId} is now offline`);

    const status = this.deviceStatusMap.get(deviceId);
    if (status) {
      status.isOnline = false;
      status.status = 'offline';
    }

    try {
      await db.query(
        `UPDATE devices SET status = 'offline', is_online = false, updated_at = NOW() WHERE id = $1`,
        [deviceId]
      );
    } catch (error) {
      logger.error(`Error updating device offline status for ${deviceId}:`, error);
    }
  }

  async updateHeartbeat(deviceId: string, heartbeat: HeartbeatPayload): Promise<void> {
    const now = Date.now();

    let status = this.deviceStatusMap.get(deviceId);
    if (!status) {
      status = {
        deviceId,
        isOnline: true,
        lastSeenAt: now,
        status: heartbeat.status || 'online',
      };
      this.deviceStatusMap.set(deviceId, status);
    } else {
      status.lastSeenAt = now;
      status.isOnline = true;
      status.status = heartbeat.status || 'online';
    }

    try {
      await db.query(
        `UPDATE devices SET status = $1, is_online = true, last_seen_at = NOW(), updated_at = NOW() WHERE id = $2`,
        [heartbeat.status || 'online', deviceId]
      );
    } catch (error) {
      logger.error(`Error updating heartbeat for device ${deviceId}:`, error);
    }
  }

  getDeviceStatus(deviceId: string): DeviceStatus | undefined {
    return this.deviceStatusMap.get(deviceId);
  }

  isDeviceOnline(deviceId: string): boolean {
    const status = this.deviceStatusMap.get(deviceId);
    return status?.isOnline || false;
  }

  private async notifyDeviceService(deviceId: string, deviceData: Record<string, any>): Promise<void> {
    try {
      await axios.post(`${config.deviceServiceUrl}/api/devices/register`, {
        deviceId,
        ...deviceData,
      }, {
        timeout: 5000,
      });
    } catch (error: any) {
      logger.warn(`Failed to notify device service for device ${deviceId}: ${error.message}`);
    }
  }

  getAllDeviceStatuses(): DeviceStatus[] {
    return Array.from(this.deviceStatusMap.values());
  }

  shutdown(): void {
    if (this.heartbeatCheckInterval) {
      clearInterval(this.heartbeatCheckInterval);
    }
  }
}

export const deviceStatusManager = new DeviceStatusManager();
export default deviceStatusManager;
