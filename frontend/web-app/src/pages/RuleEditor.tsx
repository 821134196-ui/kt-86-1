import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Space,
  Row,
  Col,
  Switch,
  Tag,
  Divider,
  message,
  Spin,
  Empty,
  Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  BulbOutlined,
  ClockCircleOutlined,
  SafetyOutlined,
  DragOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { getRule, createRule, updateRule } from '@/api/rule';
import { getDevices } from '@/api/device';
import type {
  Rule,
  RuleTrigger,
  RuleCondition,
  RuleAction,
  Device,
  RuleTriggerType,
} from '@/types';
import { generateId } from '@/utils';

const { Option } = Select;
const { TextArea } = Input;

const RuleEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [trigger, setTrigger] = useState<RuleTrigger>({
    id: generateId(),
    type: 'device_state',
    config: {},
  });
  const [conditions, setConditions] = useState<RuleCondition>({
    id: generateId(),
    operator: 'and',
    conditions: [],
  });
  const [actions, setActions] = useState<RuleAction[]>([]);
  const isNew = id === 'new' || !id;

  useEffect(() => {
    loadDevices();
    if (!isNew && id) {
      loadRule(id);
    }
  }, [id, isNew]);

  const loadDevices = async () => {
    try {
      const data = await getDevices();
      setDevices(data);
    } catch {}
  };

  const loadRule = async (ruleId: string) => {
    setLoading(true);
    try {
      const rule = await getRule(ruleId);
      form.setFieldsValue({
        name: rule.name,
        description: rule.description,
        priority: rule.priority,
        enabled: rule.enabled,
      });
      if (rule.trigger) setTrigger(rule.trigger);
      if (rule.conditions) setConditions(rule.conditions);
      if (rule.actions) setActions(rule.actions);
    } finally {
      setLoading(false);
    }
  };

  const addCondition = (parentId: string) => {
    const newCondition: RuleCondition = {
      id: generateId(),
      operator: 'and',
      deviceId: devices[0]?.id,
      comparison: 'eq',
      value: '',
    };
    setConditions((prev) => {
      const update = (cond: RuleCondition): RuleCondition => {
        if (cond.id === parentId) {
          return { ...cond, conditions: [...(cond.conditions || []), newCondition] };
        }
        if (cond.conditions) {
          return { ...cond, conditions: cond.conditions.map(update) };
        }
        return cond;
      };
      return update(prev);
    });
  };

  const updateCondition = (condId: string, updates: Partial<RuleCondition>) => {
    setConditions((prev) => {
      const update = (cond: RuleCondition): RuleCondition => {
        if (cond.id === condId) return { ...cond, ...updates };
        if (cond.conditions) {
          return { ...cond, conditions: cond.conditions.map(update) };
        }
        return cond;
      };
      return update(prev);
    });
  };

  const removeCondition = (condId: string) => {
    setConditions((prev) => {
      const update = (cond: RuleCondition): RuleCondition => {
        if (cond.conditions) {
          return {
            ...cond,
            conditions: cond.conditions.filter((c) => c.id !== condId).map(update),
          };
        }
        return cond;
      };
      return update(prev);
    });
  };

  const addAction = () => {
    const newAction: RuleAction = {
      id: generateId(),
      type: 'device_control',
      order: actions.length,
      config: { deviceId: devices[0]?.id, state: { on: true } },
    };
    setActions([...actions, newAction]);
  };

  const updateAction = (actionId: string, updates: Partial<RuleAction>) => {
    setActions((prev) => prev.map((a) => (a.id === actionId ? { ...a, ...updates } : a)));
  };

  const removeAction = (actionId: string) => {
    setActions((prev) => prev.filter((a) => a.id !== actionId));
  };

  const moveAction = (index: number, direction: 'up' | 'down') => {
    setActions((prev) => {
      const newActions = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newActions.length) return prev;
      [newActions[index], newActions[targetIndex]] = [newActions[targetIndex], newActions[index]];
      return newActions.map((a, i) => ({ ...a, order: i }));
    });
  };

  const handleSubmit = async (values: any) => {
    const ruleData: Partial<Rule> = {
      ...values,
      homeId: 'default',
      trigger,
      conditions,
      actions,
    };

    try {
      if (isNew) {
        await createRule(ruleData);
        message.success('规则创建成功');
      } else if (id) {
        await updateRule(id, ruleData);
        message.success('规则更新成功');
      }
      navigate('/rules');
    } catch (error: any) {
      message.error(error.response?.data?.message || '保存失败');
    }
  };

  const renderTriggerSection = () => (
    <Card
      title={
        <Space>
          <ClockCircleOutlined style={{ color: '#1677ff' }} />
          触发器 (Trigger)
        </Space>
      }
      style={{ marginBottom: 24 }}
    >
      <Form.Item label="触发类型" style={{ marginBottom: 16 }}>
        <Select
          style={{ width: 300 }}
          value={trigger.type}
          onChange={(type: RuleTriggerType) =>
            setTrigger({ ...trigger, type, config: {} })
          }
        >
          <Option value="device_state">设备状态变化</Option>
          <Option value="schedule">定时触发</Option>
          <Option value="geofence">地理围栏</Option>
          <Option value="manual">手动触发</Option>
        </Select>
      </Form.Item>

      {trigger.type === 'device_state' && (
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="选择设备">
              <Select
                value={trigger.config.deviceId}
                onChange={(v) =>
                  setTrigger({ ...trigger, config: { ...trigger.config, deviceId: v } })
                }
                placeholder="选择设备"
              >
                {devices.map((d) => (
                  <Option key={d.id} value={d.id}>
                    {d.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="条件">
              <Select
                value={trigger.config.operator}
                onChange={(v) =>
                  setTrigger({ ...trigger, config: { ...trigger.config, operator: v } })
                }
              >
                <Option value="eq">等于</Option>
                <Option value="neq">不等于</Option>
                <Option value="gt">大于</Option>
                <Option value="lt">小于</Option>
                <Option value="gte">大于等于</Option>
                <Option value="lte">小于等于</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item label="值">
              <Input
                value={trigger.config.value}
                onChange={(e) =>
                  setTrigger({ ...trigger, config: { ...trigger.config, value: e.target.value } })
                }
                placeholder="例如: true, 25, on"
              />
            </Form.Item>
          </Col>
        </Row>
      )}

      {trigger.type === 'schedule' && (
        <Form.Item label="Cron 表达式">
          <Input
            value={trigger.config.cron}
            onChange={(e) =>
              setTrigger({ ...trigger, config: { ...trigger.config, cron: e.target.value } })
            }
            placeholder="例如: 0 0 8 * * * (每天早上8点)"
          />
        </Form.Item>
      )}

      {trigger.type === 'geofence' && (
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="纬度">
              <InputNumber
                style={{ width: '100%' }}
                value={trigger.config.latitude}
                onChange={(v) =>
                  setTrigger({ ...trigger, config: { ...trigger.config, latitude: v } })
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="经度">
              <InputNumber
                style={{ width: '100%' }}
                value={trigger.config.longitude}
                onChange={(v) =>
                  setTrigger({ ...trigger, config: { ...trigger.config, longitude: v } })
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="半径 (米)">
              <InputNumber
                style={{ width: '100%' }}
                value={trigger.config.radius}
                onChange={(v) =>
                  setTrigger({ ...trigger, config: { ...trigger.config, radius: v } })
                }
              />
            </Form.Item>
          </Col>
        </Row>
      )}
    </Card>
  );

  const renderConditions = (cond: RuleCondition, level: number = 0): React.ReactNode => {
    if (!cond.conditions || cond.conditions.length === 0) {
      return (
        <Card
          size="small"
          style={{ marginLeft: level * 24, marginBottom: 8 }}
          title={
            <Space>
              <SafetyOutlined />
              条件
            </Space>
          }
          extra={
            level > 0 && (
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeCondition(cond.id)}
              />
            )
          }
        >
          <Row gutter={8}>
            <Col xs={24} md={8}>
              <Select
                size="small"
                style={{ width: '100%' }}
                value={cond.deviceId}
                onChange={(v) => updateCondition(cond.id, { deviceId: v })}
                placeholder="选择设备"
              >
                {devices.map((d) => (
                  <Option key={d.id} value={d.id}>
                    {d.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} md={5}>
              <Select
                size="small"
                style={{ width: '100%' }}
                value={cond.comparison}
                onChange={(v) => updateCondition(cond.id, { comparison: v })}
              >
                <Option value="eq">等于</Option>
                <Option value="neq">不等于</Option>
                <Option value="gt">大于</Option>
                <Option value="lt">小于</Option>
              </Select>
            </Col>
            <Col xs={24} md={8}>
              <Input
                size="small"
                value={cond.value as string}
                onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                placeholder="值"
              />
            </Col>
            <Col xs={24} md={3}>
              <Button
                size="small"
                icon={<PlusOutlined />}
                onClick={() => addCondition(cond.id)}
              >
                添加子条件
              </Button>
            </Col>
          </Row>
        </Card>
      );
    }

    return (
      <Card
        size="small"
        style={{ marginLeft: level * 24, marginBottom: 8 }}
        title={
          <Space>
            <SettingOutlined />
            <Select
              size="small"
              value={cond.operator}
              onChange={(v) => updateCondition(cond.id, { operator: v })}
            >
              <Option value="and">AND (全部满足)</Option>
              <Option value="or">OR (任一满足)</Option>
            </Select>
          </Space>
        }
        extra={
          <Space>
            <Button size="small" icon={<PlusOutlined />} onClick={() => addCondition(cond.id)}>
              添加条件
            </Button>
            {level > 0 && (
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeCondition(cond.id)}
              />
            )}
          </Space>
        }
      >
        {cond.conditions.map((c) => renderConditions(c, level + 1))}
      </Card>
    );
  };

  const renderConditionSection = () => (
    <Card
      title={
        <Space>
          <SafetyOutlined style={{ color: '#faad14' }} />
          条件 (Condition)
        </Space>
      }
      style={{ marginBottom: 24 }}
    >
      {renderConditions(conditions)}
      <Button icon={<PlusOutlined />} onClick={() => addCondition(conditions.id)}>
        添加条件
      </Button>
    </Card>
  );

  const renderActionSection = () => (
    <Card
      title={
        <Space>
          <BulbOutlined style={{ color: '#52c41a' }} />
          动作 (Action)
        </Space>
      }
      style={{ marginBottom: 24 }}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={addAction}>
          添加动作
        </Button>
      }
    >
      {actions.length === 0 ? (
        <Empty description="暂无动作" style={{ padding: 20 }} />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {actions.map((action, index) => (
            <Card
              key={action.id}
              size="small"
              title={
                <Space>
                  <DragOutlined style={{ cursor: 'move', color: '#999' }} />
                  <Tag color="blue">动作 {index + 1}</Tag>
                  <Select
                    size="small"
                    value={action.type}
                    onChange={(v) =>
                      updateAction(action.id, { type: v, config: {} })
                    }
                  >
                    <Option value="device_control">设备控制</Option>
                    <Option value="scene">执行场景</Option>
                    <Option value="notification">发送通知</Option>
                    <Option value="delay">延迟</Option>
                  </Select>
                </Space>
              }
              extra={
                <Space>
                  <Button
                    size="small"
                    disabled={index === 0}
                    onClick={() => moveAction(index, 'up')}
                  >
                    ↑
                  </Button>
                  <Button
                    size="small"
                    disabled={index === actions.length - 1}
                    onClick={() => moveAction(index, 'down')}
                  >
                    ↓
                  </Button>
                  <Popconfirm
                    title="删除此动作？"
                    onConfirm={() => removeAction(action.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} type="text" />
                  </Popconfirm>
                </Space>
              }
            >
              {action.type === 'device_control' && (
                <Row gutter={8}>
                  <Col xs={24} md={12}>
                    <Form.Item label="选择设备" style={{ marginBottom: 8 }}>
                      <Select
                        value={action.config.deviceId}
                        onChange={(v) =>
                          updateAction(action.id, {
                            config: { ...action.config, deviceId: v },
                          })
                        }
                        placeholder="选择设备"
                      >
                        {devices.map((d) => (
                          <Option key={d.id} value={d.id}>
                            {d.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="状态 (JSON)" style={{ marginBottom: 8 }}>
                      <Input
                        value={JSON.stringify(action.config.state || {})}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            updateAction(action.id, {
                              config: { ...action.config, state: parsed },
                            });
                          } catch {}
                        }}
                        placeholder='{"on": true}'
                      />
                    </Form.Item>
                  </Col>
                </Row>
              )}
              {action.type === 'notification' && (
                <Row gutter={8}>
                  <Col xs={24} md={8}>
                    <Form.Item label="通知类型" style={{ marginBottom: 8 }}>
                      <Select
                        value={action.config.notificationType || 'push'}
                        onChange={(v) =>
                          updateAction(action.id, {
                            config: { ...action.config, notificationType: v },
                          })
                        }
                      >
                        <Option value="push">推送</Option>
                        <Option value="sms">短信</Option>
                        <Option value="email">邮件</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={16}>
                    <Form.Item label="消息内容" style={{ marginBottom: 8 }}>
                      <Input
                        value={action.config.message}
                        onChange={(e) =>
                          updateAction(action.id, {
                            config: { ...action.config, message: e.target.value },
                          })
                        }
                        placeholder="输入通知消息"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              )}
              {action.type === 'delay' && (
                <Form.Item label="延迟时间 (毫秒)" style={{ marginBottom: 8 }}>
                  <InputNumber
                    style={{ width: 200 }}
                    min={0}
                    value={action.config.delayMs || 0}
                    onChange={(v) =>
                      updateAction(action.id, {
                        config: { ...action.config, delayMs: v || 0 },
                      })
                    }
                  />
                </Form.Item>
              )}
            </Card>
          ))}
        </Space>
      )}
    </Card>
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/rules')}>
            返回
          </Button>
          <h2 style={{ margin: 0 }}>
            <Space>
              <ThunderboltOutlined style={{ color: '#1677ff' }} />
              {isNew ? '创建规则' : '编辑规则'}
            </Space>
          </h2>
        </Space>
      </div>

      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ enabled: true, priority: 5 }}
        >
          <Card style={{ marginBottom: 24 }}>
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="规则名称"
                  name="name"
                  rules={[{ required: true, message: '请输入规则名称' }]}
                >
                  <Input placeholder="例如：回家自动开灯" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item label="优先级" name="priority">
                  <InputNumber min={1} max={100} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item label="启用状态" name="enabled" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item label="描述" name="description">
                  <TextArea rows={2} placeholder="规则描述信息（可选）" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {renderTriggerSection()}
          {renderConditionSection()}
          {renderActionSection()}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" size="large">
                {isNew ? '创建规则' : '保存规则'}
              </Button>
              <Button size="large" onClick={() => navigate('/rules')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Spin>
    </div>
  );
};

export default RuleEditor;
