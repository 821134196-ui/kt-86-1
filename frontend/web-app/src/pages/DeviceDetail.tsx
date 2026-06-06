import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Switch,
  Slider,
  Space,
  Spin,
  Tag,
  Statistic,
  Select,
  Empty,
  Divider,
  message,
  Popconfirm,
  Descriptions,
} from 'antd';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
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
import { useNavigate, useParams } from 'react-router-dom';
import { useDeviceStore } from '@/store/useDeviceStore';
import { useTelemetry } from '@/hooks/useTelemetry';
import TelemetryChart from '@/components/TelemetryChart';
import { getDeviceTypeName, formatTime, getRooms } from '@/api/auth';
import type { Device, DeviceType, DeviceCapability, Room } from '@/types';
import dayjs from 'dayjs';

const { Option } = Select;

const getIcon = (type: DeviceType, state: Record<string, any>) => {
  const isOn = state.on || state.power;
  const iconProps = { style: { fontSize: 64 } };
  const iconMap: Record<DeviceType, React.ReactNode> = {
    switch: isOn ? <BulbFilled {...iconProps} style={{ fontSize: 64, color: '#faad14' }} /> : <BulbOutlined {...iconProps} />,
    dimmer: isOn ? <BulbFilled {...iconProps} style={{ fontSize: 64, color: '#faad14' }} /> : <BulbOutlined {...iconProps} />,
    light: isOn ? <BulbFilled {...iconProps} style={{ fontSize: 64, color: '#faad14' }} /> : <BulbOutlined {...iconProps} />,
    thermostat: <ThunderboltOutlined {...iconProps} style={{ fontSize: 64, color: '#1677ff' }} />,
    ac: <CloudOutlined {...iconProps} style={{ fontSize: 64, color: '#13c2c2' }} />,
    curtain: <PartitionOutlined {...iconProps} />,
    lock: <LockOutlined {...iconProps} style={{ fontSize: 64, color: state.locked ? '#52c41a' : '#ff4d4f' }} />,
    camera: <VideoCameraOutlined {...iconProps} style={{ fontSize: 64, color: '#722ed1' }} />,
    sensor_temp: <ThunderboltOutlined {...iconProps} style={{ fontSize: 64, color: '#fa8c16' }} />,
    sensor_humidity: <ThunderboltOutlined {...iconProps} style={{ fontSize: 64, color: '#13c2c2' }} />,
    sensor_motion: <SafetyOutlined {...iconProps} style={{ fontSize: 64, color: '#eb2f96' }} />,
    sensor_door: <SafetyOutlined {...iconProps} style={{ fontSize: 64, color: '#faad14' }} />,
    other: <AppstoreOutlined {...iconProps} />,
  };
  return iconMap[type] || iconMap.other;
};

const DeviceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedDevice, fetchDevice, control, removeDevice, updateDeviceData, loading } =
    useDeviceStore();
  const { latestData, historyData, fetchHistory, loading: telemetryLoading } = useTelemetry(id);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    if (id) {
      fetchDevice(id);
    }
    loadRooms();
  }, [id, fetchDevice]);

  useEffect(() => {
    if (id && selectedDevice) {
      const keys = Object.keys(selectedDevice.state || {});
      if (keys.length > 0) {
        const key = keys[0] === 'on' || keys[0] === 'power' ? (keys[1] || keys[0]) : keys[0];
        loadHistory(key);
      }
    }
  }, [id, selectedDevice, timeRange]);

  const loadRooms = async () => {
    try {
      const data = await getRooms('default');
      setRooms(data);
    } catch {}
  };

  const loadHistory = (key: string) => {
    if (!id) return;
    const endTime = dayjs().toISOString();
    let startTime;
    switch (timeRange) {
      case '1h':
        startTime = dayjs().subtract(1, 'hour').toISOString();
        break;
      case '24h':
        startTime = dayjs().subtract(24, 'hour').toISOString();
        break;
      case '7d':
        startTime = dayjs().subtract(7, 'day').toISOString();
        break;
      default:
        startTime = dayjs().subtract(24, 'hour').toISOString();
    }
    fetchHistory(key, { startTime, endTime, interval: timeRange === '7d' ? '1h' : '5m' });
  };

  const handleToggle = async (checked: boolean) => {
    if (!id) return;
    await control(id, { on: checked, power: checked });
  };

  const handleSliderChange = async (value: number, capability: DeviceCapability) => {
    if (!id) return;
    await control(id, { [capability]: value });
  };

  const handleTemperatureChange = async (value: number) => {
    if (!id) return;
    await control(id, { temperature: value });
  };

  const handleModeChange = async (value: string) => {
    if (!id) return;
    await control(id, { mode: value });
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await removeDevice(id);
      message.success('设备已删除');
      navigate('/devices');
    } catch {
      message.error('删除失败');
    }
  };

  const handleRoomChange = async (roomId: string | null) => {
    if (!id) return;
    try {
      await updateDeviceData(id, { roomId });
      message.success('房间已更新');
    } catch {
      message.error('更新失败');
    }
  };

  if (!selectedDevice && loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!selectedDevice) {
    return <Empty description="设备不存在" />;
  }

  const device = selectedDevice;
  const statusColor = device.status === 'online' ? 'success' : device.status === 'error' ? 'error' : 'default';
  const statusText = device.status === 'online' ? '在线' : device.status === 'error' ? '异常' : '离线';
  const isOn = device.state.on || device.state.power;

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/devices')}>
            返回
          </Button>
          <div>
            <h2 style={{ margin: 0 }}>{device.name}</h2>
            <div style={{ marginTop: 4 }}>
              <Space>
                <Tag color={statusColor}>{statusText}</Tag>
                <span style={{ color: '#999' }}>{getDeviceTypeName(device.type)}</span>
              </Space>
            </div>
          </div>
        </Space>
        <Popconfirm title="确定要删除此设备吗？" onConfirm={handleDelete} okText="确定" cancelText="取消">
          <Button danger icon={<DeleteOutlined />}>
            删除设备
          </Button>
        </Popconfirm>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Card>
            <div style={{ textAlign: 'center', padding: 24 }}>
              {getIcon(device.type, device.state)}
              <Divider />
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {device.capabilities.includes('on_off') && (
                  <div>
                    <div style={{ marginBottom: 8, color: '#666' }}>电源开关</div>
                    <Switch
                      size="large"
                      checked={!!isOn}
                      onChange={handleToggle}
                      disabled={device.status === 'offline'}
                    />
                  </div>
                )}

                {device.capabilities.includes('brightness') && (
                  <div>
                    <div style={{ marginBottom: 8, color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                      <span>亮度</span>
                      <span>{device.state.brightness || 0}%</span>
                    </div>
                    <Slider
                      min={0}
                      max={100}
                      value={device.state.brightness || 0}
                      onChange={(v) => handleSliderChange(v, 'brightness')}
                      disabled={device.status === 'offline'}
                    />
                  </div>
                )}

                {device.capabilities.includes('temperature') && (
                  <div>
                    <div style={{ marginBottom: 8, color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                      <span>温度</span>
                      <span>{device.state.temperature || 0}°C</span>
                    </div>
                    <Slider
                      min={16}
                      max={30}
                      value={device.state.temperature || 24}
                      onChange={handleTemperatureChange}
                      disabled={device.status === 'offline'}
                      marks={{ 16: '16°', 22: '22°', 26: '26°', 30: '30°' }}
                    />
                  </div>
                )}

                {device.capabilities.includes('mode') && (
                  <div>
                    <div style={{ marginBottom: 8, color: '#666' }}>模式</div>
                    <Select
                      style={{ width: '100%' }}
                      value={device.state.mode || 'auto'}
                      onChange={handleModeChange}
                      disabled={device.status === 'offline'}
                    >
                      <Option value="auto">自动</Option>
                      <Option value="cool">制冷</Option>
                      <Option value="heat">制热</Option>
                      <Option value="dry">除湿</Option>
                      <Option value="fan">送风</Option>
                    </Select>
                  </div>
                )}
              </Space>
            </div>
          </Card>

          <Card title="设备信息" style={{ marginTop: 24 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="设备ID">{device.id}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatTime(device.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="最后更新">{formatTime(device.lastSeen)}</Descriptions.Item>
              <Descriptions.Item label="所属房间">
                <Select
                  style={{ width: '100%' }}
                  allowClear
                  placeholder="未分配"
                  value={device.roomId || undefined}
                  onChange={(v) => handleRoomChange(v || null)}
                >
                  {rooms.map((room) => (
                    <Option key={room.id} value={room.id}>
                      {room.name}
                    </Option>
                  ))}
                </Select>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card title="实时数据" style={{ marginBottom: 24 }}>
            <Spin spinning={telemetryLoading}>
              {latestData.length === 0 && Object.keys(device.state || {}).length === 0 ? (
                <Empty description="暂无遥测数据" />
              ) : (
                <Row gutter={[16, 16]}>
                  {Object.entries(device.state || {}).map(([key, value]) => (
                    <Col xs={12} sm={8} md={6} key={key}>
                      <Card size="small">
                        <Statistic
                          title={key}
                          value={typeof value === 'boolean' ? (value ? '开启' : '关闭') : String(value)}
                          suffix={key === 'temperature' ? '°C' : key === 'humidity' ? '%' : key === 'brightness' ? '%' : ''}
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Spin>
          </Card>

          <Card
            title="历史数据"
            extra={
              <Select value={timeRange} onChange={setTimeRange} style={{ width: 120 }}>
                <Option value="1h">最近1小时</Option>
                <Option value="24h">最近24小时</Option>
                <Option value="7d">最近7天</Option>
              </Select>
            }
          >
            <TelemetryChart data={historyData} title="数据趋势" unit="" type="line" />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DeviceDetail;
