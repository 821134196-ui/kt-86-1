# 智能家居设备管理与自动化规则平台

全栈智能家居平台，支持设备统一接入、实时遥测监控、可视化自动化规则编排、场景管理和告警通知。

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                         前端 Web 应用                        │
│  (设备面板 / 实时大盘 / 规则编排器 / 场景 / 管理后台)         │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP + WebSocket
┌────────────────────────┼────────────────────────────────────┐
│                    API Gateway (Nginx)                       │
└──────┬─────────┬──────────┬───────────┬─────────────────────┘
       │         │          │           │
┌──────▼───┐ ┌──▼──────┐ ┌─▼────────┐ ┌▼──────────────┐
│ device   │ │gateway  │ │telemetry │ │ rule-engine   │
│ service  │ │service  │ │service   │ │ (规则引擎)    │
└──────┬───┘ └──┬──────┘ └────┬─────┘ └──────┬────────┘
       │         │             │               │
┌──────▼─────────▼─────────────▼───────────────▼────────┐
│              PostgreSQL (关系数据)                     │
│   用户/家庭/房间/设备/规则/场景/告警/通知               │
└───────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────┐
│              TimescaleDB (时序数据)                     │
│          遥测数据 / 聚合视图 / 状态快照                 │
└─────────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────┐
│                    Redis (缓存)                         │
│        设备状态 / 幂等键 / 会话 / 发布订阅              │
└─────────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────┐
│               EMQX (MQTT Broker)                       │
│   设备注册 / 心跳 / 遥测上报 / 指令下发 / 指令回执       │
└──────────────────────┬─────────────────────────────────┘
                       │ MQTT
┌──────────────────────▼─────────────────────────────────┐
│               设备层 (真实 / 模拟)                       │
│     开关 / 调光 / 温湿度 / 门锁 / 摄像头 / 空调 等       │
└─────────────────────────────────────────────────────────┘
```

## 📁 工程目录结构

```
kt-86-1/
├── docker-compose.yml              # 一键启动所有服务
├── infra/                          # 基础设施初始化脚本
│   ├── postgres/init.sql          # PostgreSQL 表结构与初始数据
│   └── timescaledb/init.sql       # TimescaleDB 超表与聚合视图
├── backend/                        # 后端微服务
│   ├── device-service/            # 设备与能力模型、房间与权限服务 (:3001)
│   ├── gateway-service/           # MQTT 接入网关、指令下行、心跳检测 (:3002)
│   ├── telemetry-service/         # 遥测采集、时序存储、实时推送 (:3003)
│   ├── rule-engine/               # 规则引擎、场景、执行日志 (:3004)
│   └── alert-service/             # 告警通知、告警历史 (:3005)
├── frontend/
│   └── web-app/                   # React + Ant Design 前端 (:8080)
└── simulator/                      # MQTT 设备模拟器
```

## 🚀 快速启动

### 前置条件
- Docker >= 20.10
- Docker Compose >= 2.0

### 一键启动

```bash
# 克隆或进入项目目录
cd kt-86-1

# 启动所有服务（首次会构建镜像，需要几分钟）
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f device-service
```

### 服务访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端 Web 应用 | http://localhost:8080 | 智能家居管理平台 |
| Device Service | http://localhost:3001 | 设备管理 API |
| Gateway Service | http://localhost:3002 | 设备接入网关 API |
| Telemetry Service | http://localhost:3003 | 遥测服务 API |
| Rule Engine | http://localhost:3004 | 规则引擎 API |
| Alert Service | http://localhost:3005 | 告警服务 API |
| EMQX Dashboard | http://localhost:18083 | MQTT Broker 控制台 (admin/admin123) |
| PostgreSQL | localhost:5432 | 关系数据库 (smarthome/smarthome123) |
| TimescaleDB | localhost:5433 | 时序数据库 (telemetry/telemetry123) |
| Redis | localhost:6379 | 缓存 |

### 默认账号

- 用户名：`admin`
- 密码：`admin123`

### 停止服务

```bash
# 停止并保留数据
docker-compose down

# 停止并清除所有数据（包括数据库卷）
docker-compose down -v
```

---

## 🔧 设备能力模型说明

### 设备类型体系

平台内置以下设备类型，所有设备类型定义存储在 `device_types` 表中，`capabilities` 字段为 JSON 数组，定义设备的能力项。

### Capability 数据结构

```json
{
  "code": "brightness",
  "name": "亮度",
  "type": "number | boolean | string | enum",
  "read_only": false,
  "unit": "%",
  "min": 0,
  "max": 100,
  "enum_values": ["low", "medium", "high"],
  "default_value": 100
}
```

### 内置设备类型与能力

| 设备类型 | type_code | 能力项 |
|---------|-----------|--------|
| 智能开关 | switch | switch (boolean) |
| 智能调光器 | dimmer | switch, brightness (0-100%) |
| 温湿度传感器 | thermostat | temperature (°C), humidity (%) |
| 智能门锁 | door_lock | lock_state (locked/unlocked), battery (%) |
| 智能摄像头 | camera | motion_detected, recording, online |
| 智能窗帘 | curtain | position (0-100%), moving |
| 智能空调 | ac | power, mode, target_temp (16-30°C), fan_speed |
| 人体红外传感器 | motion_sensor | motion, illuminance (lux) |

### 扩展新设备类型

新增一种设备类型的**三个扩展点**：

**1. 数据库层（必需）**
在 `device_types` 表中插入新记录：

```sql
INSERT INTO device_types (type_code, name, description, category, icon, capabilities)
VALUES (
  'smart_plug',
  '智能插座',
  '支持电量统计的智能插座',
  'power',
  'power',
  '[
    {"code": "switch", "name": "开关", "type": "boolean", "read_only": false, "default_value": false},
    {"code": "power_consumption", "name": "功率", "type": "number", "read_only": true, "unit": "W", "default_value": 0},
    {"code": "energy_used", "name": "累计用电", "type": "number", "read_only": true, "unit": "kWh", "default_value": 0}
  ]'::jsonb
);
```

**2. 设备模拟器层（可选）**
在 `simulator/src/devices/` 下创建 `SmartPlugDevice.ts`，继承 `BaseDevice`，实现遥测数据模拟和指令响应逻辑，然后在 `simulator/src/devices/index.ts` 和 `simulator/src/config.ts` 中注册。

**3. 前端 UI 层（可选）**
在 `frontend/web-app/src/components/DeviceCard/` 中扩展设备卡片渲染逻辑，在 `frontend/web-app/src/utils/index.ts` 的设备图标映射中添加对应图标。

---

## 🧠 规则引擎数据结构与执行调度

### Trigger（触发器）数据结构

```typescript
// 1. 设备状态变化触发器
{
  "type": "device_state",
  "deviceId": "uuid",
  "capability": "temperature",
  "operator": "> | >= | < | <= | == | != | in | not_in",
  "value": 30,
  "durationMs": 5000  // 可选：状态持续多久才触发
}

// 2. 定时触发器
{
  "type": "schedule",
  "cron": "0 8 * * *",          // Cron 表达式
  "timezone": "Asia/Shanghai"   // 可选
}

// 3. 地理围栏触发器（占位）
{
  "type": "geofence",
  "geofenceId": "uuid",
  "action": "enter | leave"
}
```

### Condition（条件）数据结构

```typescript
// 支持 AND/OR 任意深度嵌套
{
  "logic": "AND | OR",
  "conditions": [
    {
      "type": "device_state",
      "deviceId": "uuid",
      "capability": "switch",
      "operator": "==",
      "value": true
    },
    {
      "type": "time_range",
      "from": "08:00",
      "to": "22:00",
      "weekdays": [1, 2, 3, 4, 5]  // 可选，1=周一
    },
    {
      "logic": "OR",
      "conditions": [/* 嵌套条件 */]
    }
  ]
}
```

### Action（动作）数据结构

```typescript
[
  {
    "type": "device_command",
    "deviceId": "uuid",
    "command": "set_state",
    "payload": { "switch": true, "brightness": 80 }
  },
  {
    "type": "delay",
    "delayMs": 5000
  },
  {
    "type": "scene",
    "sceneId": "uuid"
  },
  {
    "type": "notification",
    "channel": "in_app | email",
    "targetUserId": "uuid",     // 可选，默认通知家庭所有成员
    "title": "温度过高",
    "message": "客厅温度已超过30°C"
  }
]
```

### 规则执行调度流程

```
           Trigger 触发
               │
               ▼
     ┌─────────────────────┐
     │  防抖检查 (debounce) │◄─────── 最近触发时间 < debounceMs 则丢弃
     └──────────┬──────────┘
                │
                ▼
     ┌─────────────────────┐
     │ Trigger 条件校验     │  (durationMs 需要状态持续)
     └──────────┬──────────┘
                │
                ▼
     ┌─────────────────────┐
     │ Condition 条件评估   │  递归评估 AND/OR 组合
     └──────────┬──────────┘
                │ 条件满足
                ▼
     ┌─────────────────────┐
     │  动作按序执行        │  遇到 delay 异步等待
     │  (按优先级排序规则)  │
     └──────────┬──────────┘
                │
                ▼
     ┌─────────────────────┐
     │  记录执行日志        │  rule_execution_logs 表
     └─────────────────────┘
```

**关键特性：**
- **防抖**：`debounceMs` 防止触发器短时间内重复触发
- **优先级**：规则 `priority` 字段，数值越大优先级越高，高优先级规则先执行
- **规则启停**：`is_enabled` 字段控制规则是否生效
- **可追溯**：每次执行完整记录触发数据、条件结果、动作执行状态、耗时

---

## 📊 高频遥测写入与聚合方案

### 架构方案

```
   设备 MQTT 上报
        │
        ▼
  ┌──────────────────┐
  │  MQTT Broker     │  (EMQX)
  └────────┬─────────┘
           │ devices/+/telemetry
           ▼
  ┌──────────────────┐
  │ telemetry-service│  批量写入缓冲
  │  (内存队列)       │  批量大小: 100条 or 1秒超时
  └────────┬─────────┘
           │ pg-copy / 批量 INSERT
           ▼
  ┌─────────────────────────────────────┐
  │  TimescaleDB (Hypertable)            │
  │  ┌───────────────────────────────┐   │
  │  │ telemetry_data (原始数据)      │   │  保留策略: 30天
  │  └───────────────┬───────────────┘   │
  │                  │  连续聚合          │
  │  ┌───────────────▼───────────────┐   │
  │  │ telemetry_minute (1分钟聚合)   │   │  保留策略: 7天
  │  └───────────────┬───────────────┘   │
  │                  │  连续聚合          │
  │  ┌───────────────▼───────────────┐   │
  │  │ telemetry_hour (1小时聚合)     │   │  保留策略: 90天
  │  └───────────────┬───────────────┘   │
  │                  │  连续聚合          │
  │  ┌───────────────▼───────────────┐   │
  │  │ telemetry_day (1天聚合)        │   │  保留策略: 永久
  │  └───────────────────────────────┘   │
  └─────────────────────────────────────┘
           │
           ▼
  ┌──────────────────┐
  │  Redis 缓存       │  device_state_snapshot (设备最新状态)
  └──────────────────┘
           │ WebSocket push
           ▼
        前端实时大盘
```

### 写入优化要点

1. **批量写入**：遥测数据先写入内存队列，达到 100 条或 1 秒后批量刷盘
2. **Hypertable**：使用 TimescaleDB 的超级表，按时间自动分区
3. **参数化 SQL**：使用 `pg` 的参数化查询，防止 SQL 注入
4. **连续聚合**：分钟/小时/天级聚合通过 TimescaleDB 的 `continuous aggregate` 自动计算

### 查询接口

```
GET /api/telemetry/devices/:deviceId
    ?from=2024-01-01T00:00:00Z
    &to=2024-01-02T00:00:00Z
    &capability=temperature
    &aggregation=raw | 1m | 1h | 1d
```

### 阈值越限检测

- 阈值配置存储在 Redis（热数据）和 PostgreSQL（持久化）
- 遥测数据写入时同步进行阈值检查
- 60 秒冷却期防止频繁触发同一告警
- 越限后自动写入 `threshold_alerts` 超表，并通过 WebSocket 推送 + 调用 alert-service 创建告警

---

## 📤 指令下发的幂等与回执机制

### 指令生命周期

```
   前端 / 规则引擎
        │ POST /api/gateway/devices/:id/commands
        │ { commandType, payload, idempotencyKey }
        ▼
  ┌──────────────────────────────────────────┐
  │  幂等性检查 (Redis: idempotency:command:{key}) │
  │  ├─ 命中：直接返回已有指令记录             │
  │  └─ 未命中：继续流程                      │
  └───────────────────┬──────────────────────┘
                      │
                      ▼
  ┌──────────────────────────────────────────┐
  │  事务：创建 commands 记录 + 写入 Redis    │
  │  (status: pending)                       │
  └───────────────────┬──────────────────────┘
                      │
                      ▼
  ┌──────────────────────────────────────────┐
  │  MQTT Publish: devices/{deviceId}/commands │
  │  { commandId, commandType, payload }     │
  └───────────────────┬──────────────────────┘
                      │
                      ▼
              设备端执行指令
                      │
                      ▼
  ┌──────────────────────────────────────────┐
  │  MQTT: devices/{deviceId}/acks            │
  │  { commandId, success, message, data }   │
  └───────────────────┬──────────────────────┘
                      │
                      ▼
  ┌──────────────────────────────────────────┐
  │  更新 commands 表                        │
  │  status: acknowledged / failed           │
  │  + acknowledged_at / error_message       │
  └──────────────────────────────────────────┘
```

### 幂等性保障

**方案：客户端生成 `idempotencyKey` + Redis TTL 缓存**

1. **客户端侧**：每次下发指令生成唯一 `idempotencyKey`（UUID），缓存并在重试时复用
2. **服务端侧**：
   - Redis Key: `idempotency:command:{key}`，TTL = 24 小时
   - 检查顺序：Redis → 数据库 commands 表
   - 命中直接返回已有记录，避免重复下发 MQTT 指令

### 回执机制

1. **MQTT ACK**：设备端执行完成后通过 `devices/{deviceId}/acks` 主题返回执行结果
2. **超时检测**：指令下发后 30 秒内未收到 ACK，自动标记为 `timeout`
3. **查询接口**：`GET /api/gateway/devices/:id/commands/:commandId` 可查询指令执行状态

---

## 🚨 告警与通知

### 告警类型

| 类型 | alert_type | 触发条件 | 默认级别 |
|------|-----------|---------|---------|
| 设备离线 | device_offline | 设备心跳超时 (30s) | warning |
| 阈值越限 | threshold_exceeded | 遥测数据超出配置阈值 | warning/error |
| 规则执行失败 | rule_execution_failed | 规则动作执行异常 | error |
| 设备异常 | device_error | 设备主动上报 error 事件 | error |

### 通知通道

| 通道 | 说明 | 状态 |
|------|------|------|
| 站内通知 | 前端应用内通知中心 | ✅ 已实现 |
| 邮件通知 | SMTP 发送邮件 | 🚧 占位实现 |

### 告警处理流程

1. 告警创建 → 自动为家庭成员生成站内通知
2. WebSocket 实时推送给在线用户
3. 用户确认告警（acknowledge）
4. 用户标记解决（resolve）

---

## 📝 API 契约总览

详细的 API 契约请参考 [API-CONTRACT.md](./API-CONTRACT.md)。

### 各服务 API 前缀

| 服务 | API 前缀 | 端口 |
|------|---------|------|
| Device Service | `/api` | 3001 |
| Gateway Service | `/api/gateway` | 3002 |
| Telemetry Service | `/api/telemetry` | 3003 |
| Rule Engine | `/api` (rules, scenes) | 3004 |
| Alert Service | `/api` (alerts, notifications) | 3005 |

---

## 🔐 权限与角色

### 角色层级

| 角色 | 权限说明 |
|------|---------|
| admin (管理员) | 家庭所有权限：设备管理、成员管理、规则配置、场景编辑、告警处理 |
| member (成员) | 设备控制、查看遥测、执行场景、处理告警；不可管理成员和设备类型 |
| guest (访客) | 只读权限：查看设备状态和遥测数据；不可控制设备 |

### 权限控制策略

- **家庭成员权限**：基于 `home_members` 表的 `role` + `permissions` JSONB
- **设备共享权限**：基于 `device_shares` 表，可设置 `read/control` 细粒度权限
- **JWT 认证**：所有 API 通过 `Authorization: Bearer <token>` 进行身份认证

---

## 🛠️ 本地开发

### 后端服务本地运行

每个后端服务都可以独立本地运行：

```bash
cd backend/device-service
npm install
cp .env.example .env   # 修改数据库连接指向本地或 Docker
npm run dev
```

### 前端本地开发

```bash
cd frontend/web-app
npm install
npm run dev   # http://localhost:5173，已配置 API 代理
```

### 仅启动基础设施

```bash
# 只启动 PostgreSQL、TimescaleDB、Redis、MQTT，方便本地调试后端代码
docker-compose up -d postgres timescaledb redis mqtt-broker
```

---

## 📈 可观测性

各服务均提供健康检查端点：

```
GET /api/health
```

返回示例：
```json
{
  "status": "ok",
  "services": {
    "postgres": "connected",
    "redis": "connected",
    "mqtt": "connected"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 📚 常见问题

**Q: 设备模拟器如何添加更多模拟设备？**
A: 修改 `simulator/src/config.ts` 中的 `SIMULATED_DEVICES` 数组，添加新设备配置即可。

**Q: 如何接入真实 MQTT 设备？**
A: 让真实设备连接到 `mqtt://localhost:1883`，按照约定的 Topic 规范（见架构文档）注册并上报数据即可。

**Q: 如何配置告警邮件通知？**
A: 修改 `backend/alert-service/src/services/notificationService.ts` 中的 `sendEmailNotification` 函数，配置 SMTP 信息。

---

## 📄 License

MIT
