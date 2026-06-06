import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Input,
  Select,
  Button,
  Space,
  Spin,
  Empty,
  Modal,
  Form,
  message,
  Tag,
} from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useDeviceStore } from '@/store/useDeviceStore';
import { getRooms } from '@/api/auth';
import DeviceCard from '@/components/DeviceCard';
import type { DeviceType, Room } from '@/types';
import { getDeviceTypeName } from '@/utils';

const { Option } = Select;

const Devices: React.FC = () => {
  const { devices, loading, fetchDevices, addDevice } = useDeviceStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterRoom, setFilterRoom] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchDevices();
    loadRooms();
  }, [fetchDevices]);

  const loadRooms = async () => {
    try {
      const data = await getRooms('default');
      setRooms(data);
    } catch {}
  };

  const filteredDevices = devices.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(searchText.toLowerCase());
    const matchRoom = !filterRoom || d.roomId === filterRoom;
    const matchStatus = !filterStatus || d.status === filterStatus;
    return matchSearch && matchRoom && matchStatus;
  });

  const handleCreateDevice = async (values: any) => {
    try {
      await addDevice({
        ...values,
        homeId: 'default',
        state: {},
        capabilities: values.capabilities || ['on_off'],
      });
      message.success('设备创建成功');
      setIsModalOpen(false);
      form.resetFields();
      fetchDevices();
    } catch (error: any) {
      message.error(error.response?.data?.message || '创建设备失败');
    }
  };

  const deviceTypes: DeviceType[] = [
    'switch',
    'dimmer',
    'light',
    'thermostat',
    'ac',
    'curtain',
    'lock',
    'camera',
    'sensor_temp',
    'sensor_humidity',
    'sensor_motion',
    'sensor_door',
    'other',
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ margin: 0, marginBottom: 8 }}>设备管理</h2>
          <p style={{ margin: 0, color: '#999' }}>管理您家中的所有智能设备</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchDevices()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            添加设备
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Input
              placeholder="搜索设备名称"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              placeholder="按房间筛选"
              style={{ width: '100%' }}
              allowClear
              value={filterRoom}
              onChange={setFilterRoom}
            >
              {rooms.map((room) => (
                <Option key={room.id} value={room.id}>
                  {room.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} md={6}>
            <Select
              placeholder="按状态筛选"
              style={{ width: '100%' }}
              allowClear
              value={filterStatus}
              onChange={setFilterStatus}
            >
              <Option value="online">在线</Option>
              <Option value="offline">离线</Option>
              <Option value="error">异常</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        {filteredDevices.length === 0 ? (
          <Empty description="暂无设备" style={{ padding: 80 }} />
        ) : (
          <Row gutter={[16, 16]}>
            {filteredDevices.map((device) => (
              <Col xs={24} sm={12} md={8} lg={6} key={device.id}>
                <DeviceCard device={device} />
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      <Modal
        title="添加设备"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateDevice}>
          <Form.Item
            label="设备名称"
            name="name"
            rules={[{ required: true, message: '请输入设备名称' }]}
          >
            <Input placeholder="请输入设备名称" />
          </Form.Item>
          <Form.Item
            label="设备类型"
            name="type"
            rules={[{ required: true, message: '请选择设备类型' }]}
          >
            <Select placeholder="请选择设备类型">
              {deviceTypes.map((type) => (
                <Option key={type} value={type}>
                  {getDeviceTypeName(type)}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="所属房间" name="roomId">
            <Select placeholder="请选择房间" allowClear>
              {rooms.map((room) => (
                <Option key={room.id} value={room.id}>
                  {room.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="设备能力" name="capabilities">
            <Select
              mode="multiple"
              placeholder="请选择设备能力"
              options={[
                { value: 'on_off', label: '开关' },
                { value: 'brightness', label: '亮度调节' },
                { value: 'color', label: '颜色调节' },
                { value: 'temperature', label: '温度控制' },
                { value: 'mode', label: '模式切换' },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
              <Button onClick={() => setIsModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Devices;
