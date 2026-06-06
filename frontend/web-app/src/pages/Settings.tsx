import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Avatar,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Row,
  Col,
  Divider,
  List,
  Switch,
} from 'antd';
import {
  SettingOutlined,
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/useAuthStore';
import type { User } from '@/types';

const { Option } = Select;

const mockMembers: (User & { permissions: string[] })[] = [
  {
    id: '1',
    email: 'admin@example.com',
    username: '管理员',
    role: 'admin',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    permissions: ['全部权限'],
  },
  {
    id: '2',
    email: 'member@example.com',
    username: '家庭成员',
    role: 'member',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    permissions: ['设备控制', '场景执行'],
  },
  {
    id: '3',
    email: 'guest@example.com',
    username: '访客',
    role: 'guest',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
    permissions: ['查看设备'],
  },
];

const mockSharedDevices = [
  { id: '1', name: '客厅灯光', sharedWith: ['member@example.com', 'guest@example.com'] },
  { id: '2', name: '客厅空调', sharedWith: ['member@example.com'] },
  { id: '3', name: '卧室灯光', sharedWith: ['member@example.com'] },
];

const Settings: React.FC = () => {
  const { user } = useAuthStore();
  const [members, setMembers] = useState(mockMembers);
  const [sharedDevices] = useState(mockSharedDevices);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    sms: false,
  });

  const openAddMember = () => {
    setEditingMember(null);
    form.resetFields();
    setIsMemberModalOpen(true);
  };

  const openEditMember = (member: User) => {
    setEditingMember(member);
    form.setFieldsValue({
      email: member.email,
      username: member.username,
      role: member.role,
    });
    setIsMemberModalOpen(true);
  };

  const handleSubmitMember = (values: any) => {
    if (editingMember) {
      setMembers((prev) =>
        prev.map((m) => (m.id === editingMember.id ? { ...m, ...values } : m))
      );
      message.success('成员信息已更新');
    } else {
      const newMember: any = {
        id: String(Date.now()),
        ...values,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        permissions: values.role === 'admin' ? ['全部权限'] : values.role === 'member' ? ['设备控制', '场景执行'] : ['查看设备'],
      };
      setMembers([...members, newMember]);
      message.success('成员已添加');
    }
    setIsMemberModalOpen(false);
  };

  const handleRemoveMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    message.success('成员已移除');
  };

  const getRoleColor = (role: string) => {
    const map: Record<string, string> = {
      admin: 'red',
      member: 'blue',
      guest: 'default',
    };
    return map[role] || 'default';
  };

  const getRoleText = (role: string) => {
    const map: Record<string, string> = {
      admin: '管理员',
      member: '成员',
      guest: '访客',
    };
    return map[role] || role;
  };

  const columns = [
    {
      title: '用户',
      key: 'user',
      render: (_: any, record: User) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 500 }}>{record.username}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => <Tag color={getRoleColor(role)}>{getRoleText(role)}</Tag>,
    },
    {
      title: '权限',
      key: 'permissions',
      render: (_: any, record: any) => (
        <Space wrap>
          {record.permissions?.map((p: string) => (
            <Tag key={p} color="purple">
              {p}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '加入时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => new Date(time).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: User) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openEditMember(record)}
            disabled={record.id === user?.id}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定移除此成员？"
            onConfirm={() => handleRemoveMember(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={record.id === user?.id}
          >
            <Button type="link" danger icon={<DeleteOutlined />} disabled={record.id === user?.id}>
              移除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, marginBottom: 8 }}>
          <Space>
            <SettingOutlined style={{ color: '#722ed1' }} />
            系统设置
          </Space>
        </h2>
        <p style={{ margin: 0, color: '#999' }}>管理家庭成员、权限和通知设置</p>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <UserOutlined />
                家庭成员管理
              </Space>
            }
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={openAddMember}>
                添加成员
              </Button>
            }
            style={{ marginBottom: 16 }}
          >
            <Table
              columns={columns}
              dataSource={members as any}
              rowKey="id"
              pagination={false}
            />
          </Card>

          <Card
            title={
              <Space>
                <SafetyOutlined />
                通知设置
              </Space>
            }
          >
            <List
              dataSource={[
                { key: 'push', title: '推送通知', desc: '通过 App 推送接收告警和系统消息' },
                { key: 'email', title: '邮件通知', desc: '通过邮件接收重要告警信息' },
                { key: 'sms', title: '短信通知', desc: '通过短信接收紧急告警（可能产生费用）' },
              ]}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Switch
                      key={item.key}
                      checked={(notifications as any)[item.key]}
                      onChange={(v) => setNotifications({ ...notifications, [item.key]: v })}
                    />,
                  ]}
                >
                  <List.Item.Meta title={item.title} description={item.desc} />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <BulbOutlined />
                设备共享
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {sharedDevices.map((device) => (
                <Card key={device.id} size="small">
                  <div style={{ fontWeight: 500, marginBottom: 8 }}>{device.name}</div>
                  <div>
                    <span style={{ fontSize: 12, color: '#999' }}>共享给: </span>
                    <Space wrap>
                      {device.sharedWith.map((email) => (
                        <Tag key={email} color="blue">
                          {email}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                </Card>
              ))}
            </Space>
            <Divider />
            <Button icon={<PlusOutlined />} block type="dashed">
              添加共享设备
            </Button>
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingMember ? '编辑成员' : '添加成员'}
        open={isMemberModalOpen}
        onCancel={() => setIsMemberModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmitMember}>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效邮箱' },
            ]}
          >
            <Input placeholder="成员邮箱" />
          </Form.Item>
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="成员名称" />
          </Form.Item>
          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select>
              <Option value="admin">管理员 - 拥有全部权限</Option>
              <Option value="member">成员 - 可控制设备和执行场景</Option>
              <Option value="guest">访客 - 仅可查看</Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsMemberModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingMember ? '保存' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Settings;
