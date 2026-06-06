import React, { useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Switch,
  Tag,
  Modal,
  message,
  Popconfirm,
  Spin,
  Empty,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getRules, deleteRule, toggleRule } from '@/api/rule';
import type { Rule } from '@/types';
import { formatTime } from '@/utils';
import { useState } from 'react';

const Rules: React.FC = () => {
  const navigate = useNavigate();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await getRules();
      setRules(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await toggleRule(id, enabled);
      message.success(enabled ? '规则已启用' : '规则已禁用');
      loadRules();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRule(id);
      message.success('规则已删除');
      loadRules();
    } catch {
      message.error('删除失败');
    }
  };

  const getTriggerTypeText = (type: string) => {
    const map: Record<string, string> = {
      device_state: '设备状态',
      schedule: '定时触发',
      geofence: '地理围栏',
      manual: '手动触发',
    };
    return map[type] || type;
  };

  const columns = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Rule) => (
        <a onClick={() => navigate(`/rules/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '触发类型',
      dataIndex: ['trigger', 'type'],
      key: 'triggerType',
      render: (type: string) => <Tag color="blue">{getTriggerTypeText(type)}</Tag>,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
    },
    {
      title: '动作数量',
      key: 'actionCount',
      width: 100,
      render: (_: any, record: Rule) => <span>{record.actions?.length || 0}</span>,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 120,
      render: (enabled: boolean, record: Rule) => (
        <Switch checked={enabled} onChange={(v) => handleToggle(record.id, v)} />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => formatTime(time),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: any, record: Rule) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/rules/${record.id}`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此规则吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

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
              <ThunderboltOutlined style={{ color: '#1677ff' }} />
              规则编排
            </Space>
          </h2>
          <p style={{ margin: 0, color: '#999' }}>创建和管理自动化规则，实现智能家居联动</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/rules/new')}>
          创建规则
        </Button>
      </div>

      <Spin spinning={loading}>
        {rules.length === 0 ? (
          <Empty
            description={
              <div>
                <p>暂无规则</p>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/rules/new')}>
                  创建第一条规则
                </Button>
              </div>
            }
            style={{ padding: 80 }}
          />
        ) : (
          <Table columns={columns} dataSource={rules} rowKey="id" pagination={{ pageSize: 10 }} />
        )}
      </Spin>
    </div>
  );
};

export default Rules;
