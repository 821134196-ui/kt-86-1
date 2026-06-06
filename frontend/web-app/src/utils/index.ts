import dayjs from 'dayjs';
import type { DeviceType, AlertSeverity } from '@/types';

export const getDeviceIcon = (type: DeviceType): string => {
  const iconMap: Record<DeviceType, string> = {
    switch: 'BulbOutlined',
    dimmer: 'BulbOutlined',
    light: 'BulbOutlined',
    thermostat: 'ThunderboltOutlined',
    ac: 'CloudOutlined',
    curtain: 'PartitionOutlined',
    lock: 'LockOutlined',
    camera: 'VideoCameraOutlined',
    sensor_temp: 'ThunderboltOutlined',
    sensor_humidity: 'ThunderboltOutlined',
    sensor_motion: 'SafetyOutlined',
    sensor_door: 'SafetyOutlined',
    other: 'AppstoreOutlined',
  };
  return iconMap[type] || iconMap.other;
};

export const getDeviceTypeName = (type: DeviceType): string => {
  const nameMap: Record<DeviceType, string> = {
    switch: '开关',
    dimmer: '调光器',
    light: '灯光',
    thermostat: '温控器',
    ac: '空调',
    curtain: '窗帘',
    lock: '智能锁',
    camera: '摄像头',
    sensor_temp: '温度传感器',
    sensor_humidity: '湿度传感器',
    sensor_motion: '运动传感器',
    sensor_door: '门磁传感器',
    other: '其他设备',
  };
  return nameMap[type] || nameMap.other;
};

export const formatTime = (date: string | Date | undefined): string => {
  if (!date) return '-';
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

export const formatRelativeTime = (date: string | Date | undefined): string => {
  if (!date) return '-';
  return dayjs(date).fromNow();
};

export const getSeverityColor = (severity: AlertSeverity): string => {
  const colorMap: Record<AlertSeverity, string> = {
    info: '#52c41a',
    warning: '#faad14',
    critical: '#ff4d4f',
  };
  return colorMap[severity];
};

export const getSeverityName = (severity: AlertSeverity): string => {
  const nameMap: Record<AlertSeverity, string> = {
    info: '信息',
    warning: '警告',
    critical: '严重',
  };
  return nameMap[severity];
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};
