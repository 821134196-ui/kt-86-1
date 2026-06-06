import React from 'react';
import { Card, Switch, Tag, Button, Space } from 'antd';
import {
  BulbOutlined,
  BulbFilled,
  ThunderboltOutlined,
  SafetyOutlined,
  LockOutlined,
  VideoCameraOutlined,
  PartitionOutlined,
  CloudOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Device, DeviceType } from '@/types';
import { getDeviceTypeName, formatRelativeTime } from '@/utils';
import { useDeviceStore } from '@/store/useDeviceStore';

interface DeviceCardProps {
  device: Device;
  showControl?: boolean;
}

const getIcon = (type: DeviceType, state: Record<string, any>) => {
  const isOn = state.on || state.power;
  const iconMap: Record<DeviceType, React.ReactNode> = {
    switch: isOn ? <BulbFilled style={{ fontSize: 32, color: '#faad14' }} /> : <BulbOutlined style={{ fontSize: 32 }} />,
    dimmer: isOn ? <BulbFilled style={{ fontSize: 32, color: '#faad14' }} /> : <BulbOutlined style={{ fontSize: 32 }} />,
    light: isOn ? <BulbFilled style={{ fontSize: 32, color: '#faad14' }} /> : <BulbOutlined style={{ fontSize: 32 }} />,
    thermostat: <ThunderboltOutlined style={{ fontSize: 32, color: '#1677ff' }} />,
    ac: <CloudOutlined style={{ fontSize: 32, color: '#13c2c2' }} />,
    curtain: <PartitionOutlined style={{ fontSize: 32 }} />,
    lock: <LockOutlined style={{ fontSize: 32, color: state.locked ? '#52c41a' : '#ff4d4f' }} />,
    camera: <VideoCameraOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
    sensor_temp: <ThunderboltOutlined style={{ fontSize: 32, color: '#fa8c16' }} />,
    sensor_humidity: <ThunderboltOutlined style={{ fontSize: 32, color: '#13c2c2' }} />,
    sensor_motion: <SafetyOutlined style={{ fontSize: 32, color: '#eb2f96' }} />,
    sensor_door: <SafetyOutlined style={{ fontSize: 32, color: '#faad14' }} />,
    other: <AppstoreOutlined style={{ fontSize: 32 }} />,
  };
  return iconMap[type] || iconMap.other;
};

const DeviceCard: React.FC<DeviceCardProps> = ({ device, showControl = true }) => {
  const navigate = useNavigate();
  const { control } = useDeviceStore();
  const isOn = device.state.on || device.state.power;

  const handleToggle = async (checked: boolean) => {
    await control(device.id, { on: checked, power: checked });
  };

  const getTelemetryDisplay = () => {
    const items: string[] = [];
    if (device.state.temperature !== undefined) {
      items.push(`${device.state.temperature}°C`);
    }
    if (device.state.humidity !== undefined) {
      items.push(`${device.state.humidity}%`);
    }
    if (device.state.brightness !== undefined) {
      items.push(`亮度 ${device.state.brightness}%`);
    }
    return items.join(' · ');
  };

  const statusColor = device.status === 'online' ? 'success' : device.status === 'error' ? 'error' : 'default';
  const statusText = device.status === 'online' ? '在线' : device.status === 'error' ? '异常' : '离线';

  return (
    <Card
      hoverable
      onClick={() => navigate(`/devices/${device.id}`)}
      style={{ marginBottom: 16 }}
      styles={{ body: { padding: 16 } }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {getIcon(device.type, device.state)}
          <Space direction="vertical" align="end" size={4} onClick={(e) => e.stopPropagation()}>
            {showControl && device.capabilities.includes('on_off') && (
              <Switch checked={!!isOn} onChange={handleToggle} disabled={device.status === 'offline'} />
            )}
            <Tag color={statusColor} style={{ margin: 0 }}>
              {statusText}
            </Tag>
          </Space>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{device.name}</div>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
            {getDeviceTypeName(device.type)}
          </div>
          {getTelemetryDisplay() && (
            <div style={{ fontSize: 14, color: '#1677ff', fontWeight: 500 }}>
              {getTelemetryDisplay()}
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#bbb', marginTop: 'auto' }}>
          最后更新: {formatRelativeTime(device.lastSeen)}
        </div>
      </div>
    </Card>
  );
};

export default DeviceCard;
