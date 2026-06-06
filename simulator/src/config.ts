import { DeviceConfig, DeviceType } from './types';

export const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
export const DEVICE_SERVICE_URL = process.env.DEVICE_SERVICE_URL || 'http://localhost:3000';
export const SIMULATION_SPEED = parseFloat(process.env.SIMULATION_SPEED || '1');

export const HEARTBEAT_INTERVAL = 30000 / SIMULATION_SPEED;
export const TELEMETRY_MIN_INTERVAL = 5000 / SIMULATION_SPEED;
export const TELEMETRY_MAX_INTERVAL = 15000 / SIMULATION_SPEED;

export const DEVICE_CAPABILITIES: Record<DeviceType, string[]> = {
  [DeviceType.SWITCH]: ['on', 'off'],
  [DeviceType.DIMMER]: ['on', 'off', 'set_brightness'],
  [DeviceType.TEMPERATURE_HUMIDITY]: ['read_temperature', 'read_humidity'],
  [DeviceType.LOCK]: ['lock', 'unlock'],
  [DeviceType.CAMERA]: ['start_stream', 'stop_stream', 'take_snapshot'],
  [DeviceType.CURTAIN]: ['open', 'close', 'set_position'],
  [DeviceType.AIR_CONDITIONER]: ['on', 'off', 'set_temperature', 'set_mode'],
  [DeviceType.MOTION_SENSOR]: ['detect_motion']
};

export const SIMULATED_DEVICES: DeviceConfig[] = [
  { id: 'switch-living-1', name: '客厅开关1', type: DeviceType.SWITCH, room: '客厅' },
  { id: 'switch-living-2', name: '客厅开关2', type: DeviceType.SWITCH, room: '客厅' },
  { id: 'dimmer-living-1', name: '客厅调光器', type: DeviceType.DIMMER, room: '客厅' },
  { id: 'temp-humidity-living-1', name: '客厅温湿度', type: DeviceType.TEMPERATURE_HUMIDITY, room: '客厅' },
  { id: 'motion-living-1', name: '客厅人体传感器', type: DeviceType.MOTION_SENSOR, room: '客厅' },
  { id: 'ac-bedroom-1', name: '主卧空调', type: DeviceType.AIR_CONDITIONER, room: '主卧' },
  { id: 'curtain-bedroom-1', name: '主卧窗帘', type: DeviceType.CURTAIN, room: '主卧' },
  { id: 'lock-door-1', name: '门锁', type: DeviceType.LOCK, room: '入口' },
  { id: 'camera-living-1', name: '摄像头', type: DeviceType.CAMERA, room: '客厅' }
];

export const OFFLINE_PROBABILITY = 0.02;
export const ALERT_PROBABILITY = 0.01;
