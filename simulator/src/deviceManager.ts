import { BaseDevice } from './devices/BaseDevice';
import {
  SwitchDevice,
  DimmerDevice,
  TemperatureHumiditySensor,
  LockDevice,
  CameraDevice,
  CurtainDevice,
  AirConditionerDevice,
  MotionSensorDevice
} from './devices';
import { SIMULATED_DEVICES } from './config';
import { DeviceConfig, DeviceType } from './types';
import { mqttManager } from './mqttManager';
import { sleep } from './utils';

export class DeviceManager {
  private devices: Map<string, BaseDevice> = new Map();

  async start(): Promise<void> {
    console.log('[DeviceManager] Starting device simulator...');

    await mqttManager.connect();

    await sleep(1000);

    for (const config of SIMULATED_DEVICES) {
      const device = this.createDevice(config);
      if (device) {
        this.devices.set(config.id, device);
        await device.initialize();
        await sleep(200);
      }
    }

    console.log(`[DeviceManager] Started ${this.devices.size} devices`);

    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  private createDevice(config: DeviceConfig): BaseDevice | null {
    switch (config.type) {
      case DeviceType.SWITCH:
        return new SwitchDevice(config);
      case DeviceType.DIMMER:
        return new DimmerDevice(config);
      case DeviceType.TEMPERATURE_HUMIDITY:
        return new TemperatureHumiditySensor(config);
      case DeviceType.LOCK:
        return new LockDevice(config);
      case DeviceType.CAMERA:
        return new CameraDevice(config);
      case DeviceType.CURTAIN:
        return new CurtainDevice(config);
      case DeviceType.AIR_CONDITIONER:
        return new AirConditionerDevice(config);
      case DeviceType.MOTION_SENSOR:
        return new MotionSensorDevice(config);
      default:
        console.warn(`[DeviceManager] Unknown device type: ${config.type}`);
        return null;
    }
  }

  getDevice(deviceId: string): BaseDevice | undefined {
    return this.devices.get(deviceId);
  }

  getAllDevices(): BaseDevice[] {
    return Array.from(this.devices.values());
  }

  private shutdown(): void {
    console.log('[DeviceManager] Shutting down...');
    for (const device of this.devices.values()) {
      device.destroy();
    }
    mqttManager.disconnect();
    process.exit(0);
  }
}

export const deviceManager = new DeviceManager();
