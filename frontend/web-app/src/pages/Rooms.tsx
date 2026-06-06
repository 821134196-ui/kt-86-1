import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Spin,
  Empty,
  Popconfirm,
  List,
  Tag,
  Select,
  Avatar,
} from 'antd';
import {
  PlusOutlined,
  HomeOutlined,
  EditOutlined,
  DeleteOutlined,
  BulbOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { getRooms, createRoom, updateRoom, deleteRoom } from '@/api/auth';
import { getDevices, assignDeviceToRoom } from '@/api/device';
import type { Room, Device } from '@/types';

const { Option } = Select;

const Rooms: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [roomsData, devicesData] = await Promise.all([
        getRooms('default'),
        getDevices(),
      ]);
      setRooms(roomsData);
      setDevices(devicesData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingRoom(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    form.setFieldsValue({ name: room.name });
    setIsModalOpen(true);
  };

  const handleSubmit = async (values: { name: string }) => {
    try {
      if (editingRoom) {
        await updateRoom(editingRoom.id, values.name);
        message.success('房间更新成功');
      } else {
        await createRoom('default', values.name);
        message.success('房间创建成功');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRoom(id);
      message.success('房间已删除');
      loadData();
    } catch {
      message.error('删除失败');
    }
  };

  const handleAssignDevice = async (deviceId: string, roomId: string | null) => {
    try {
      await assignDeviceToRoom(deviceId, roomId);
      message.success('设备已更新');
      loadData();
    } catch {
      message.error('更新失败');
    }
  };

  const getDevicesForRoom = (roomId: string) => devices.filter((d) => d.roomId === roomId);
  const getUnassignedDevices = () => devices.filter((d) => !d.roomId);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
        }}
      >
        <div>
          <h2 style={{ margin: 0, marginBottom: 8 }}>
            <Space>
              <HomeOutlined style={{ color: '#13c2c2' }} />
              房间与分组
            </Space>
          </h2>
          <p style={{ margin: 0, color: '#999' }}>管理房间和设备分组，让智能家居更有条理</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          添加房间
        </Button>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {rooms.length === 0 ? (
            <Col span={24}>
              <Empty description="暂无房间" style={{ padding: 40 }} />
            </Col>
          ) : (
            rooms.map((room) => {
              const roomDevices = getDevicesForRoom(room.id);
              return (
                <Col xs={24} md={12} lg={8} key={room.id}>
                  <Card
                    title={
                      <Space>
                        <HomeOutlined style={{ color: '#13c2c2' }} />
                        {room.name}
                      </Space>
                    }
                    extra={
                      <Space>
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={() => openEditModal(room)}
                        />
                        <Popconfirm
                          title="确定删除此房间？"
                          onConfirm={() => handleDelete(room.id)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Button type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    }
                  >
                    {roomDevices.length === 0 ? (
                      <Empty description="房间内暂无设备" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                      <List
                        size="small"
                        dataSource={roomDevices}
                        renderItem={(device) => (
                          <List.Item
                            key={device.id}
                            actions={[
                              <Select
                                key="move"
                                size="small"
                                style={{ width: 120 }}
                                value={device.roomId}
                                placeholder="移动到"
                                onChange={(v) => handleAssignDevice(device.id, v || null)}
                              >
                                <Option value="">未分配</Option>
                                {rooms.map((r) => (
                                  <Option key={r.id} value={r.id}>
                                    {r.name}
                                  </Option>
                                ))}
                              </Select>,
                            ]}
                          >
                            <List.Item.Meta
                              avatar={
                                <Avatar icon={<BulbOutlined />} style={{ backgroundColor: '#e6f7ff' }} />
                              }
                              title={device.name}
                              description={
                                <Tag
                                  color={
                                    device.status === 'online'
                                      ? 'success'
                                      : device.status === 'error'
                                      ? 'error'
                                      : 'default'
                                  }
                                >
                                  {device.status === 'online' ? '在线' : device.status === 'error' ? '异常' : '离线'}
                                </Tag>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    )}
                  </Card>
                </Col>
              );
            })
          )}

          <Col xs={24} md={12} lg={8}>
            <Card
              title={
                <Space>
                  <AppstoreOutlined style={{ color: '#999' }} />
                  未分配设备
                </Space>
              }
            >
              {getUnassignedDevices().length === 0 ? (
                <Empty description="所有设备已分配" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  size="small"
                  dataSource={getUnassignedDevices()}
                  renderItem={(device) => (
                    <List.Item
                      key={device.id}
                      actions={[
                        <Select
                          key="assign"
                          size="small"
                          style={{ width: 120 }}
                          placeholder="分配到房间"
                          onChange={(v) => handleAssignDevice(device.id, v)}
                        >
                          {rooms.map((r) => (
                            <Option key={r.id} value={r.id}>
                              {r.name}
                            </Option>
                          ))}
                        </Select>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar icon={<BulbOutlined />} style={{ backgroundColor: '#f0f0f0' }} />
                        }
                        title={device.name}
                        description={
                          <Tag
                            color={
                              device.status === 'online'
                                ? 'success'
                                : device.status === 'error'
                                ? 'error'
                                : 'default'
                            }
                          >
                            {device.status === 'online' ? '在线' : device.status === 'error' ? '异常' : '离线'}
                          </Tag>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
        </Row>
      </Spin>

      <Modal
        title={editingRoom ? '编辑房间' : '添加房间'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="房间名称"
            name="name"
            rules={[{ required: true, message: '请输入房间名称' }]}
          >
            <Input placeholder="例如：客厅、卧室、厨房" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingRoom ? '保存' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Rooms;
