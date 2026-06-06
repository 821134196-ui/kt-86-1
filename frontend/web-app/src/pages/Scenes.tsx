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
  Select,
  message,
  Spin,
  Empty,
  Popconfirm,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  PartitionOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { getScenes, createScene, updateScene, deleteScene, executeScene } from '@/api/scene';
import { getDevices } from '@/api/device';
import type { Scene, SceneAction, Device } from '@/types';
import { formatTime, generateId } from '@/utils';

const { Option } = Select;
const { TextArea } = Input;

const iconOptions = [
  { value: 'BulbOutlined', label: '灯泡', icon: <BulbOutlined /> },
  { value: 'ThunderboltOutlined', label: '闪电', icon: <ThunderboltOutlined /> },
  { value: 'SunOutlined', label: '太阳', icon: <SunOutlined /> },
  { value: 'MoonOutlined', label: '月亮', icon: <MoonOutlined /> },
  { value: 'PartitionOutlined', label: '分区', icon: <PartitionOutlined /> },
];

const Scenes: React.FC = () => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [form] = Form.useForm();
  const [sceneActions, setSceneActions] = useState<SceneAction[]>([]);

  const loadScenes = async () => {
    setLoading(true);
    try {
      const data = await getScenes();
      setScenes(data);
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const data = await getDevices();
      setDevices(data);
    } catch {}
  };

  useEffect(() => {
    loadScenes();
    loadDevices();
  }, []);

  const openCreateModal = () => {
    setEditingScene(null);
    setSceneActions([]);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (scene: Scene) => {
    setEditingScene(scene);
    setSceneActions(scene.actions || []);
    form.setFieldsValue({
      name: scene.name,
      description: scene.description,
      icon: scene.icon,
    });
    setIsModalOpen(true);
  };

  const addAction = () => {
    setSceneActions([
      ...sceneActions,
      {
        id: generateId(),
        deviceId: devices[0]?.id || '',
        state: { on: true },
        order: sceneActions.length,
      },
    ]);
  };

  const updateAction = (id: string, updates: Partial<SceneAction>) => {
    setSceneActions((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const removeAction = (id: string) => {
    setSceneActions((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = async (values: any) => {
    const sceneData: Partial<Scene> = {
      ...values,
      homeId: 'default',
      actions: sceneActions,
    };

    try {
      if (editingScene) {
        await updateScene(editingScene.id, sceneData);
        message.success('场景更新成功');
      } else {
        await createScene(sceneData);
        message.success('场景创建成功');
      }
      setIsModalOpen(false);
      loadScenes();
    } catch (error: any) {
      message.error(error.response?.data?.message || '保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteScene(id);
      message.success('场景已删除');
      loadScenes();
    } catch {
      message.error('删除失败');
    }
  };

  const handleExecute = async (id: string) => {
    try {
      await executeScene(id);
      message.success('场景执行成功');
    } catch {
      message.error('场景执行失败');
    }
  };

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
              <PartitionOutlined style={{ color: '#722ed1' }} />
              场景管理
            </Space>
          </h2>
          <p style={{ margin: 0, color: '#999' }}>一键执行多个设备动作，打造智能生活场景</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          创建场景
        </Button>
      </div>

      <Spin spinning={loading}>
        {scenes.length === 0 ? (
          <Empty
            description={
              <div>
                <p>暂无场景</p>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                  创建第一个场景
                </Button>
              </div>
            }
            style={{ padding: 80 }}
          />
        ) : (
          <Row gutter={[16, 16]}>
            {scenes.map((scene) => (
              <Col xs={24} sm={12} md={8} lg={6} key={scene.id}>
                <Card
                  hoverable
                  styles={{ body: { padding: 20 } }}
                  actions={[
                    <PlayCircleOutlined
                      key="execute"
                      style={{ fontSize: 20, color: '#1677ff' }}
                      onClick={() => handleExecute(scene.id)}
                    />,
                    <EditOutlined
                      key="edit"
                      style={{ fontSize: 18 }}
                      onClick={() => openEditModal(scene)}
                    />,
                    <Popconfirm
                      key="delete"
                      title="确定删除此场景？"
                      onConfirm={() => handleDelete(scene.id)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <DeleteOutlined style={{ fontSize: 18, color: '#ff4d4f' }} />
                    </Popconfirm>,
                  ]}
                >
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 48,
                        color: '#722ed1',
                        marginBottom: 12,
                      }}
                    >
                      {scene.icon === 'SunOutlined' ? (
                        <SunOutlined />
                      ) : scene.icon === 'MoonOutlined' ? (
                        <MoonOutlined />
                      ) : scene.icon === 'ThunderboltOutlined' ? (
                        <ThunderboltOutlined />
                      ) : (
                        <BulbOutlined />
                      )}
                    </div>
                    <h3 style={{ margin: 0, marginBottom: 4 }}>{scene.name}</h3>
                    {scene.description && (
                      <p style={{ margin: 0, color: '#999', fontSize: 13 }}>{scene.description}</p>
                    )}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Space>
                      <Tag color="purple">{scene.actions?.length || 0} 个动作</Tag>
                      {scene.lastExecuted && (
                        <span style={{ fontSize: 11, color: '#bbb' }}>
                          上次: {formatTime(scene.lastExecuted)}
                        </span>
                      )}
                    </Space>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      <Modal
        title={editingScene ? '编辑场景' : '创建场景'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={720}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item
                label="场景名称"
                name="name"
                rules={[{ required: true, message: '请输入场景名称' }]}
              >
                <Input placeholder="例如：回家模式、睡眠模式" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="图标" name="icon">
                <Select placeholder="选择图标">
                  {iconOptions.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      <Space>{opt.icon} {opt.label}</Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="场景描述" name="description">
            <TextArea rows={2} placeholder="描述这个场景的用途" />
          </Form.Item>

          <Form.Item label="场景动作">
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {sceneActions.length === 0 && <Empty description="暂无动作" style={{ padding: 16 }} />}
              {sceneActions.map((action, index) => (
                <Card key={action.id} size="small">
                  <Row gutter={8} align="middle">
                    <Col span={1}>
                      <Tag color="blue">{index + 1}</Tag>
                    </Col>
                    <Col span={9}>
                      <Select
                        style={{ width: '100%' }}
                        value={action.deviceId}
                        onChange={(v) => updateAction(action.id, { deviceId: v })}
                        placeholder="选择设备"
                      >
                        {devices.map((d) => (
                          <Option key={d.id} value={d.id}>
                            {d.name}
                          </Option>
                        ))}
                      </Select>
                    </Col>
                    <Col span={10}>
                      <Input
                        value={JSON.stringify(action.state)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            updateAction(action.id, { state: parsed });
                          } catch {}
                        }}
                        placeholder='{"on": true}'
                      />
                    </Col>
                    <Col span={4} style={{ textAlign: 'right' }}>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeAction(action.id)}
                      />
                    </Col>
                  </Row>
                </Card>
              ))}
              <Button icon={<PlusOutlined />} onClick={addAction} block>
                添加动作
              </Button>
            </Space>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingScene ? '保存' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Scenes;
