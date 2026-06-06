import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Select,
  message,
  Spin,
  Empty,
  Popconfirm,
  Card,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  SafetyOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useAlertStore } from '@/store/useAlertStore';
import type { Alert, AlertStatus, AlertSeverity } from '@/types';
import { formatTime, getSeverityColor, getSeverityName } from '@/utils';

const { Option } = Select;

const Alerts: React.FC = () => {
  const { alerts, loading, fetchAlerts, acknowledge, resolve } = useAlertStore();
  const [filterStatus, setFilterStatus] = useState<AlertStatus | undefined>();
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | undefined>();

  useEffect(() => {
    loadAlerts();
  }, [filterStatus, filterSeverity]);

  const loadAlerts = () => {
    fetchAlerts({ status: filterStatus, severity: filterSeverity });
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledge(id);
      message.success('告警已确认');
    } catch {
      message.error('操作失败');
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await resolve(id);
      message.success('告警已解决');
    } catch {
      message.error('操作失败');
    }
  };

  const getStatusColor = (status: AlertStatus) => {
    const map: Record<AlertStatus, string> = {
      open: 'red',
      acknowledged: 'gold',
      resolved: 'green',
    };
    return map[status];
  };

  const getStatusText = (status: AlertStatus) => {
    const map: Record<AlertStatus, string> = {
      open: '未处理',
      acknowledged: '已确认',
      resolved: '已解决',
    };
    return map[status];
  };

  const columns = [
    {
      title: '严重级别',
      dataIndex: 'severity',
      key: 'severity',
      width: 120,
      render: (severity: AlertSeverity) => (
        <Tag color={getSeverityColor(severity)} icon={<WarningOutlined />}>
          {getSeverityName(severity)}
        </Tag>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 140,
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: AlertStatus) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>,
    },
    {
      title: '设备ID',
      dataIndex: 'deviceId',
      key: 'deviceId',
      width: 200,
      render: (id?: string) => id || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (time: string) => formatTime(time),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: Alert) => (
        <Space>
          {record.status === 'open' && (
            <Button
              type="link"
              icon={<CheckOutlined />}
              onClick={() => handleAcknowledge(record.id)}
            >
              确认
            </Button>
          )}
          {record.status !== 'resolved' && (
            <Popconfirm
              title="标记为已解决？"
              onConfirm={() => handleResolve(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" icon={<CloseOutlined />}>
                解决
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const openCount = alerts.filter((a) => a.status === 'open').length;
  const ackCount = alerts.filter((a) => a.status === 'acknowledged').length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;

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
          <h2 style={{ margin: 0, marginBottom: 8 }}>
            <Space>
              <SafetyOutlined style={{ color: '#faad14' }} />
              告警中心
            </Space>
          </h2>
          <p style={{ margin: 0, color: '#999' }}>查看和处理系统告警，保障家庭安全</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadAlerts}>
            刷新
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="未处理告警"
              value={openCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="已确认告警"
              value={ackCount}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="严重告警"
              value={criticalCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<SafetyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <span style={{ marginRight: 8 }}>状态:</span>
            <Select
              style={{ width: 160 }}
              allowClear
              placeholder="全部状态"
              value={filterStatus}
              onChange={setFilterStatus}
            >
              <Option value="open">未处理</Option>
              <Option value="acknowledged">已确认</Option>
              <Option value="resolved">已解决</Option>
            </Select>
          </Col>
          <Col xs={24} md={8}>
            <span style={{ marginRight: 8 }}>级别:</span>
            <Select
              style={{ width: 160 }}
              allowClear
              placeholder="全部级别"
              value={filterSeverity}
              onChange={setFilterSeverity}
            >
              <Option value="info">信息</Option>
              <Option value="warning">警告</Option>
              <Option value="critical">严重</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        {alerts.length === 0 ? (
          <Empty description="暂无告警" style={{ padding: 80 }} />
        ) : (
          <Table columns={columns} dataSource={alerts} rowKey="id" pagination={{ pageSize: 10 }} />
        )}
      </Spin>
    </div>
  );
};

export default Alerts;
