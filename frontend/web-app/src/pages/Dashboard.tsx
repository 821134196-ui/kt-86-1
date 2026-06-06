import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  List,
  Tag,
  Button,
  Space,
  Spin,
  Alert as AntAlert,
  Empty,
} from 'antd';
import {
  BulbOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { Line } from '@ant-design/charts';
import { useNavigate } from 'react-router-dom';
import { useDeviceStore } from '@/store/useDeviceStore';
import { useAlertStore } from '@/store/useAlertStore';
import { getScenes, executeScene } from '@/api/scene';
import type { Scene, AlertSeverity } from '@/types';
import { formatRelativeTime, getSeverityColor, getSeverityName } from '@/utils';
import dayjs from 'dayjs';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { devices, loading: devicesLoading, fetchDevices } = useDeviceStore();
  const { alerts, loading: alertsLoading, fetchAlerts } = useAlertStore();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [scenesLoading, setScenesLoading] = useState(false);

  useEffect(() => {
    fetchDevices();
    fetchAlerts({ status: 'open' });
    loadScenes();
  }, [fetchDevices, fetchAlerts]);

  const loadScenes = async () => {
    setScenesLoading(true);
    try {
      const data = await getScenes();
      setScenes(data);
    } finally {
      setScenesLoading(false);
    }
  };

  const handleExecuteScene = async (sceneId: string) => {
    try {
      await executeScene(sceneId);
    } catch {}
  };

  const onlineCount = devices.filter((d) => d.status === 'online').length;
  const offlineCount = devices.filter((d) => d.status === 'offline').length;
  const errorCount = devices.filter((d) => d.status === 'error').length;
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length;

  const generateMockChartData = () => {
    const data = [];
    for (let i = 23; i >= 0; i--) {
      data.push({
        time: dayjs().subtract(i, 'hour').format('HH:00'),
        温度: 22 + Math.random() * 5,
        湿度: 45 + Math.random() * 15,
      });
    }
    return data;
  };

  const lineConfig = {
    data: generateMockChartData(),
    xField: 'time',
    yField: ['温度', '湿度'],
    smooth: true,
    color: ['#fa8c16', '#13c2c2'],
    point: { size: 3 },
    height: 280,
    legend: { position: 'top' },
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, marginBottom: 8 }}>实时大盘</h2>
        <p style={{ margin: 0, color: '#999' }}>查看您家的实时状态和数据概览</p>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="设备总数"
              value={devices.length}
              prefix={<BulbOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="在线设备"
              value={onlineCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="离线设备"
              value={offlineCount}
              prefix={<ExclamationCircleOutlined style={{ color: '#999' }} />}
              valueStyle={{ color: '#999' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="严重告警"
              value={criticalAlerts}
              prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <ThunderboltOutlined style={{ color: '#1677ff' }} />
                实时遥测概览
              </Space>
            }
            extra={
              <Button type="link" onClick={() => navigate('/devices')}>
                查看全部设备
              </Button>
            }
          >
            <Spin spinning={devicesLoading}>
              <Line {...lineConfig} />
            </Spin>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <WarningOutlined style={{ color: '#faad14' }} />
                最近告警
              </Space>
            }
            extra={
              <Button type="link" onClick={() => navigate('/alerts')}>
                全部告警
              </Button>
            }
            style={{ height: '100%' }}
          >
            <Spin spinning={alertsLoading}>
              {alerts.length === 0 ? (
                <Empty description="暂无告警" style={{ padding: 40 }} />
              ) : (
                <List
                  dataSource={alerts.slice(0, 5)}
                  renderItem={(alert) => (
                    <List.Item key={alert.id}>
                      <List.Item.Meta
                        avatar={
                          <Tag color={getSeverityColor(alert.severity as AlertSeverity)}>
                            {getSeverityName(alert.severity as AlertSeverity)}
                          </Tag>
                        }
                        title={alert.message}
                        description={formatRelativeTime(alert.createdAt)}
                      />
                    </List.Item>
                  )}
                />
              )}
            </Spin>
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: 24 }}>
        <Card
          title={
            <Space>
              <PlayCircleOutlined style={{ color: '#722ed1' }} />
              快捷场景
            </Space>
          }
          extra={
            <Button type="link" onClick={() => navigate('/scenes')}>
              管理场景
            </Button>
          }
        >
          <Spin spinning={scenesLoading}>
            {scenes.length === 0 ? (
              <Empty description="暂无场景" style={{ padding: 20 }} />
            ) : (
              <Row gutter={[16, 16]}>
                {scenes.slice(0, 6).map((scene) => (
                  <Col xs={24} sm={12} md={8} key={scene.id}>
                    <AntAlert
                      type="info"
                      showIcon
                      message={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 500 }}>{scene.name}</span>
                          <Button
                            size="small"
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            onClick={() => handleExecuteScene(scene.id)}
                          >
                            执行
                          </Button>
                        </div>
                      }
                      description={scene.description || '点击按钮立即执行'}
                    />
                  </Col>
                ))}
              </Row>
            )}
          </Spin>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
