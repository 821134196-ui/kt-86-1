import { DEVICE_CAPABILITIES, HEARTBEAT_INTERVAL, TELEMETRY_MAX_INTERVAL, TELEMETRY_MIN_INTERVAL, OFFLINE_PROBABILITY, ALERT_PROBABILITY } from '../config';
import { deviceServiceClient } from '../deviceServiceClient';
import { mqttManager } from '../mqttManager';
import { Command, CommandAck, DeviceConfig, DeviceStatus, HeartbeatPayload, RegisterPayload, TelemetryData } from '../types';
import { clamp, getTimestamp, randomInRange, withProbability } from '../utils';

export abstract class BaseDevice {
  protected config: DeviceConfig;
  protected status: DeviceStatus = DeviceStatus.ONLINE;
  protected state: Record<string, any> = {};
  protected startTime: number;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private telemetryTimer: NodeJS.Timeout | null = null;
  private offlineUntil: number = 0;

  constructor(config: DeviceConfig) {
    this.config = config;
    this.startTime = getTimestamp();
  }

  get deviceId(): string {
    return this.config.id;
  }

  get deviceName(): string {
    return this.config.name;
  }

  async initialize(): Promise<void> {
    console.log(`[${this.deviceName}] Initializing device...`);
    
    this.initState();

    await this.registerDevice();

    mqttManager.subscribeCommands(this.deviceId, (command) => this.handleCommand(command));

    this.startHeartbeat();
    this.scheduleNextTelemetry();
  }

  protected abstract initState(): void;
  protected abstract generateTelemetry(): TelemetryData;
  protected abstract executeCommand(action: string, params?: Record<string, any>): { success: boolean; message?: string };

  protected clampStateValue(key: string, min: number, max: number): void {
    if (typeof this.state[key] === 'number') {
      this.state[key] = clamp(this.state[key], min, max);
    }
  }

  protected randomWalk(key: string, min: number, max: number, step: number): void {
    if (typeof this.state[key] === 'number') {
      const delta = randomInRange(-step, step);
      this.state[key] = clamp(this.state[key] + delta, min, max);
    }
  }

  private async registerDevice(): Promise<void> {
    const payload: RegisterPayload = {
      deviceId: this.config.id,
      name: this.config.name,
      type: this.config.type,
      room: this.config.room,
      capabilities: DEVICE_CAPABILITIES[this.config.type]
    };

    mqttManager.publishRegister(this.deviceId, payload);
    await deviceServiceClient.registerDevice(payload);
  }

  private startHeartbeat(): void {
    this.sendHeartbeat();
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), HEARTBEAT_INTERVAL);
  }

  private sendHeartbeat(): void {
    const now = getTimestamp();
    
    if (now < this.offlineUntil) {
      return;
    }

    if (withProbability(OFFLINE_PROBABILITY)) {
      this.offlineUntil = now + randomInRange(60000, 300000);
      this.status = DeviceStatus.OFFLINE;
      console.log(`[${this.deviceName}] Going offline temporarily...`);
      deviceServiceClient.updateDeviceStatus(this.deviceId, DeviceStatus.OFFLINE);
      return;
    }

    if (withProbability(ALERT_PROBABILITY)) {
      this.status = DeviceStatus.ERROR;
      console.log(`[${this.deviceName}] Simulating error state...`);
    } else {
      this.status = DeviceStatus.ONLINE;
    }

    const payload: HeartbeatPayload = {
      deviceId: this.deviceId,
      status: this.status,
      timestamp: now,
      uptime: now - this.startTime
    };

    mqttManager.publishHeartbeat(this.deviceId, payload);
    deviceServiceClient.updateDeviceStatus(this.deviceId, this.status);
  }

  private scheduleNextTelemetry(): void {
    const interval = randomInRange(TELEMETRY_MIN_INTERVAL, TELEMETRY_MAX_INTERVAL);
    this.telemetryTimer = setTimeout(() => {
      this.sendTelemetry();
      this.scheduleNextTelemetry();
    }, interval);
  }

  private sendTelemetry(): void {
    if (getTimestamp() < this.offlineUntil) {
      return;
    }

    const telemetry = this.generateTelemetry();
    mqttManager.publishTelemetry(this.deviceId, telemetry);
    console.log(`[${this.deviceName}] Telemetry:`, JSON.stringify(telemetry));
  }

  private handleCommand(command: Command): void {
    console.log(`[${this.deviceName}] Received command:`, command);

    let result: { success: boolean; message?: string };

    if (this.status === DeviceStatus.OFFLINE || getTimestamp() < this.offlineUntil) {
      result = { success: false, message: 'Device is offline' };
    } else {
      try {
        result = this.executeCommand(command.action, command.params);
      } catch (err: any) {
        result = { success: false, message: err.message };
      }
    }

    const ack: CommandAck = {
      commandId: command.id,
      success: result.success,
      message: result.message,
      timestamp: getTimestamp()
    };

    mqttManager.publishAck(this.deviceId, ack);
    console.log(`[${this.deviceName}] Ack sent:`, ack);
  }

  destroy(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.telemetryTimer) {
      clearTimeout(this.telemetryTimer);
      this.telemetryTimer = null;
    }
    console.log(`[${this.deviceName}] Destroyed`);
  }
}
