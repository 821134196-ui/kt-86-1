# 智能家居平台 API 契约

> 所有接口返回统一格式：
> ```json
> {
>   "code": 0,
>   "message": "success",
>   "data": {}
> }
> ```
> `code=0` 表示成功，非 0 表示失败。

---

## 目录

- [1. Device Service (端口 3001)](#1-device-service-端口-3001)
  - [1.1 认证](#11-认证)
  - [1.2 家庭管理](#12-家庭管理)
  - [1.3 房间与分组](#13-房间与分组)
  - [1.4 设备类型与能力](#14-设备类型与能力)
  - [1.5 设备管理](#15-设备管理)
  - [1.6 设备共享](#16-设备共享)
- [2. Gateway Service (端口 3002)](#2-gateway-service-端口-3002)
  - [2.1 指令下发](#21-指令下发)
- [3. Telemetry Service (端口 3003)](#3-telemetry-service-端口-3003)
  - [3.1 遥测数据](#31-遥测数据)
  - [3.2 阈值管理](#32-阈值管理)
  - [3.3 WebSocket 协议](#33-websocket-协议)
- [4. Rule Engine (端口 3004)](#4-rule-engine-端口-3004)
  - [4.1 规则管理](#41-规则管理)
  - [4.2 场景管理](#42-场景管理)
- [5. Alert Service (端口 3005)](#5-alert-service-端口-3005)
  - [5.1 告警管理](#51-告警管理)
  - [5.2 通知管理](#52-通知管理)
  - [5.3 内部接口](#53-内部接口)
- [6. MQTT Topic 规范](#6-mqtt-topic-规范)

---

## 1. Device Service (端口 3001)

### 1.1 认证

#### POST `/api/auth/register`
用户注册。

**请求体：**
```json
{
  "username": "string (必填, 3-50字符)",
  "email": "string (必填, 有效邮箱)",
  "password": "string (必填, 6-50字符)",
  "fullName": "string (可选)"
}
```

**响应 data：**
```json
{
  "user": { "id": "uuid", "username": "admin", "email": "...", "fullName": "..." },
  "token": "jwt-token-string"
}
```

#### POST `/api/auth/login`
用户登录。

**请求体：**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应 data：**
```json
{
  "user": { "id": "uuid", "username": "admin", "email": "..." },
  "token": "jwt-token-string"
}
```

#### GET `/api/auth/me`
获取当前用户信息（需要 JWT）。

**响应 data：**
```json
{
  "id": "uuid",
  "username": "admin",
  "email": "admin@smarthome.local",
  "fullName": "系统管理员"
}
```

#### POST `/api/auth/logout`
用户登出（JWT 加入黑名单）。

---

### 1.2 家庭管理

#### GET `/api/homes`
获取用户所属家庭列表。

**响应 data：**
```json
[
  {
    "id": "uuid",
    "name": "我的家",
    "description": "默认家庭",
    "address": "...",
    "role": "admin | member | guest",
    "createdAt": "ISO8601"
  }
]
```

#### POST `/api/homes`
创建家庭。

**请求体：**
```json
{
  "name": "我的家",
  "description": "string (可选)",
  "address": "string (可选)"
}
```

#### GET `/api/homes/:id`
获取家庭详情。

#### PUT `/api/homes/:id`
更新家庭信息。

#### DELETE `/api/homes/:id`
删除家庭（仅管理员）。

#### GET `/api/homes/:id/members`
获取家庭成员列表。

**响应 data：**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "user": { "username": "admin", "fullName": "...", "email": "..." },
    "role": "admin",
    "permissions": { "manageDevices": true, "..." : true },
    "joinedAt": "ISO8601"
  }
]
```

#### POST `/api/homes/:id/members`
添加家庭成员。

**请求体：**
```json
{
  "userId": "uuid",
  "role": "admin | member | guest",
  "permissions": {
    "manageDevices": true,
    "manageMembers": false,
    "manageRules": true,
    "manageScenes": true,
    "viewTelemetry": true,
    "controlDevices": true
  }
}
```

#### DELETE `/api/homes/:id/members/:userId`
移除家庭成员。

---

### 1.3 房间与分组

#### GET `/api/rooms`
获取房间列表（Query: `homeId`）。

#### POST `/api/rooms`
创建房间。

**请求体：**
```json
{
  "homeId": "uuid",
  "name": "客厅",
  "floor": 1,
  "icon": "living",
  "sortOrder": 1
}
```

#### GET `/api/rooms/:id`
获取房间详情（含设备列表）。

#### PUT `/api/rooms/:id`
更新房间。

#### DELETE `/api/rooms/:id`
删除房间。

#### GET `/api/device-groups`
获取设备分组列表（Query: `homeId`）。

#### POST `/api/device-groups`
创建设备分组。

**请求体：**
```json
{
  "homeId": "uuid",
  "name": "客厅灯光",
  "description": "...",
  "icon": "lightbulb"
}
```

#### POST `/api/device-groups/:id/devices`
添加设备到分组。

**请求体：**
```json
{
  "deviceIds": ["uuid1", "uuid2"]
}
```

#### DELETE `/api/device-groups/:id/devices/:deviceId`
从分组移除设备。

---

### 1.4 设备类型与能力

#### GET `/api/device-types`
获取所有设备类型定义。

**响应 data：**
```json
[
  {
    "id": "uuid",
    "typeCode": "thermostat",
    "name": "温湿度传感器",
    "description": "...",
    "category": "sensor",
    "icon": "thermometer",
    "capabilities": [
      {
        "code": "temperature",
        "name": "温度",
        "type": "number",
        "readOnly": true,
        "unit": "°C",
        "min": -40,
        "max": 80,
        "defaultValue": 25
      }
    ]
  }
]
```

#### POST `/api/device-types`
新增设备类型（仅系统管理员）。

---

### 1.5 设备管理

#### GET `/api/devices`
获取设备列表。

**Query 参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| homeId | string | 家庭 ID（必填） |
| roomId | string | 房间 ID（可选） |
| groupId | string | 分组 ID（可选） |
| status | string | online/offline（可选） |

**响应 data：**
```json
[
  {
    "id": "uuid",
    "homeId": "uuid",
    "roomId": "uuid | null",
    "deviceTypeId": "uuid",
    "deviceType": { "typeCode": "switch", "name": "智能开关", "icon": "lightbulb" },
    "name": "客厅主灯",
    "mqttTopicPrefix": "devices/uuid-xxx",
    "serialNumber": "SN-001",
    "status": "online",
    "isOnline": true,
    "lastSeenAt": "ISO8601",
    "currentState": {
      "switch": true,
      "brightness": 80
    },
    "firmwareVersion": "v1.2.3",
    "createdAt": "ISO8601"
  }
]
```

#### POST `/api/devices`
创建设备（设备注册）。

**请求体：**
```json
{
  "homeId": "uuid",
  "roomId": "uuid (可选)",
  "deviceTypeId": "uuid",
  "name": "客厅主灯",
  "description": "...",
  "serialNumber": "SN-001"
}
```

#### GET `/api/devices/:id`
获取设备详情。

#### PUT `/api/devices/:id`
更新设备信息。

#### DELETE `/api/devices/:id`
删除设备。

#### POST `/api/devices/:id/command`
发送设备控制指令（通过 Gateway Service）。

**请求体：**
```json
{
  "commandType": "set_state",
  "payload": {
    "switch": true,
    "brightness": 80
  }
}
```

**响应 data：**
```json
{
  "commandId": "uuid",
  "status": "pending"
}
```

---

### 1.6 设备共享

#### GET `/api/devices/:id/shares`
获取设备共享列表。

#### POST `/api/devices/:id/shares`
共享设备给其他用户。

**请求体：**
```json
{
  "sharedWithUserId": "uuid",
  "permissions": {
    "read": true,
    "control": false
  },
  "expiresAt": "ISO8601 (可选)"
}
```

#### DELETE `/api/devices/:id/shares/:shareId`
取消设备共享。

---

## 2. Gateway Service (端口 3002)

### 2.1 指令下发

#### POST `/api/gateway/devices/:id/commands`
下发控制指令到设备。

**请求体：**
```json
{
  "commandType": "set_state | reboot | firmware_update",
  "payload": { "...": "..." },
  "idempotencyKey": "uuid (客户端生成，用于幂等)"
}
```

**响应 data：**
```json
{
  "commandId": "uuid",
  "idempotencyKey": "uuid",
  "status": "pending | acknowledged | failed | timeout",
  "sentAt": "ISO8601"
}
```

#### GET `/api/gateway/devices/:id/commands/:commandId`
查询指令执行状态。

**响应 data：**
```json
{
  "commandId": "uuid",
  "deviceId": "uuid",
  "commandType": "set_state",
  "payload": { "...": "..." },
  "status": "acknowledged",
  "sentAt": "ISO8601",
  "acknowledgedAt": "ISO8601",
  "responsePayload": { "success": true },
  "errorMessage": null
}
```

#### GET `/api/gateway/health`
健康检查。

---

## 3. Telemetry Service (端口 3003)

### 3.1 遥测数据

#### GET `/api/telemetry/devices/:deviceId`
查询设备遥测历史数据。

**Query 参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| from | string | 是 | 起始时间 (ISO8601) |
| to | string | 是 | 结束时间 (ISO8601) |
| capability | string | 否 | 指定能力项，默认全部 |
| aggregation | string | 否 | `raw` / `1m` / `1h` / `1d`，默认 `raw` |

**响应 data (raw)：**
```json
[
  {
    "time": "2024-01-01T00:00:00.000Z",
    "deviceId": "uuid",
    "capability": "temperature",
    "value": 25.5,
    "valueString": null,
    "valueBoolean": null
  }
]
```

**响应 data (聚合)：**
```json
[
  {
    "bucket": "2024-01-01T00:00:00.000Z",
    "deviceId": "uuid",
    "capability": "temperature",
    "avgValue": 25.5,
    "minValue": 24.0,
    "maxValue": 27.0,
    "sampleCount": 60
  }
]
```

#### GET `/api/telemetry/devices/:deviceId/latest`
获取设备最新状态快照。

**响应 data：**
```json
{
  "deviceId": "uuid",
  "state": {
    "temperature": {
      "value": 25.5,
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "humidity": {
      "value": 50,
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### POST `/api/telemetry/ingest`
内部接口：遥测数据写入入口（供 gateway-service 调用）。

### 3.2 阈值管理

#### GET `/api/telemetry/devices/:deviceId/thresholds`
查询设备阈值配置。

**响应 data：**
```json
[
  {
    "id": "uuid",
    "deviceId": "uuid",
    "capability": "temperature",
    "thresholdType": "max | min",
    "thresholdValue": 35,
    "severity": "warning | error | critical",
    "enabled": true
  }
]
```

#### POST `/api/telemetry/devices/:deviceId/thresholds`
设置阈值。

**请求体：**
```json
{
  "capability": "temperature",
  "thresholdType": "max",
  "thresholdValue": 35,
  "severity": "warning",
  "enabled": true
}
```

#### DELETE `/api/telemetry/thresholds/:id`
删除阈值。

### 3.3 WebSocket 协议

**连接地址：** `ws://host:3003/api/telemetry/ws`

**客户端 → 服务端消息：**

```json
// 订阅设备实时遥测
{ "type": "subscribe", "data": { "deviceId": "uuid" } }

// 取消订阅
{ "type": "unsubscribe", "data": { "deviceId": "uuid" } }

// 心跳
{ "type": "ping" }
```

**服务端 → 客户端消息：**

```json
// 实时遥测数据
{
  "type": "telemetry",
  "data": {
    "deviceId": "uuid",
    "time": "ISO8601",
    "capability": "temperature",
    "value": 25.5
  }
}

// 阈值告警
{
  "type": "alert",
  "data": {
    "deviceId": "uuid",
    "capability": "temperature",
    "thresholdType": "max",
    "thresholdValue": 30,
    "actualValue": 32.5,
    "severity": "warning"
  }
}

// pong 响应
{ "type": "pong" }
```

#### GET `/api/telemetry/health`
健康检查。

---

## 4. Rule Engine (端口 3004)

### 4.1 规则管理

#### GET `/api/rules`
获取规则列表。

**Query 参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| homeId | string | 家庭 ID（必填） |
| isEnabled | boolean | 是否启用（可选） |

**响应 data：**
```json
[
  {
    "id": "uuid",
    "homeId": "uuid",
    "name": "温度过高自动开空调",
    "description": "...",
    "isEnabled": true,
    "priority": 10,
    "debounceMs": 5000,
    "triggerConfig": {
      "type": "device_state",
      "deviceId": "uuid",
      "capability": "temperature",
      "operator": ">",
      "value": 30
    },
    "conditionConfig": {
      "logic": "AND",
      "conditions": [
        { "type": "time_range", "from": "08:00", "to": "22:00" }
      ]
    },
    "actionConfig": [
      { "type": "device_command", "deviceId": "uuid", "payload": { "power": true } },
      { "type": "delay", "delayMs": 1000 },
      { "type": "notification", "title": "...", "message": "..." }
    ],
    "lastTriggeredAt": "ISO8601 | null",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
]
```

#### POST `/api/rules`
创建规则。

**请求体：**
```json
{
  "homeId": "uuid",
  "name": "温度过高自动开空调",
  "description": "...",
  "isEnabled": true,
  "priority": 10,
  "debounceMs": 5000,
  "triggerConfig": {
    "type": "device_state | schedule | geofence",
    "deviceId": "uuid (device_state 必填)",
    "capability": "temperature (device_state 必填)",
    "operator": "> (device_state 必填)",
    "value": 30,
    "cron": "0 8 * * * (schedule 必填)",
    "geofenceId": "uuid (geofence 必填)",
    "action": "enter | leave (geofence 必填)"
  },
  "conditionConfig": {
    "logic": "AND | OR",
    "conditions": [
      { "type": "device_state", "deviceId": "...", "capability": "...", "operator": "==", "value": true },
      { "type": "time_range", "from": "08:00", "to": "22:00", "weekdays": [1,2,3,4,5] }
    ]
  },
  "actionConfig": [
    { "type": "device_command", "deviceId": "uuid", "command": "set_state", "payload": { "power": true } },
    { "type": "scene", "sceneId": "uuid" },
    { "type": "delay", "delayMs": 5000 },
    { "type": "notification", "channel": "in_app", "title": "...", "message": "..." }
  ]
}
```

#### GET `/api/rules/:id`
获取规则详情。

#### PUT `/api/rules/:id`
更新规则。

#### DELETE `/api/rules/:id`
删除规则。

#### POST `/api/rules/:id/enable`
启用规则。

#### POST `/api/rules/:id/disable`
禁用规则。

#### POST `/api/rules/:id/trigger`
手动触发规则（用于测试）。

#### GET `/api/rules/:id/executions`
获取规则执行日志。

**Query 参数：**
- `page`: number，默认 1
- `pageSize`: number，默认 20

**响应 data：**
```json
{
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "list": [
    {
      "id": "uuid",
      "ruleId": "uuid",
      "triggerData": { "...": "..." },
      "conditionResult": true,
      "actionsExecuted": [ { "...": "..." } ],
      "status": "success | skipped | failed",
      "errorMessage": null,
      "executionTimeMs": 123,
      "createdAt": "ISO8601"
    }
  ]
}
```

### 4.2 场景管理

#### GET `/api/scenes`
获取场景列表（Query: `homeId`）。

**响应 data：**
```json
[
  {
    "id": "uuid",
    "homeId": "uuid",
    "name": "回家模式",
    "description": "...",
    "icon": "home",
    "color": "#1890ff",
    "isEnabled": true,
    "sortOrder": 1,
    "actions": [
      {
        "id": "uuid",
        "deviceId": "uuid",
        "deviceName": "客厅主灯",
        "actionType": "set_state",
        "payload": { "switch": true, "brightness": 80 },
        "delayMs": 0,
        "sortOrder": 1
      }
    ]
  }
]
```

#### POST `/api/scenes`
创建场景。

**请求体：**
```json
{
  "homeId": "uuid",
  "name": "回家模式",
  "description": "...",
  "icon": "home",
  "color": "#1890ff",
  "actions": [
    { "deviceId": "uuid", "actionType": "set_state", "payload": { "switch": true }, "delayMs": 0, "sortOrder": 1 }
  ]
}
```

#### GET `/api/scenes/:id`
获取场景详情。

#### PUT `/api/scenes/:id`
更新场景。

#### DELETE `/api/scenes/:id`
删除场景。

#### POST `/api/scenes/:id/execute`
一键执行场景。

**响应 data：**
```json
{
  "executionId": "uuid",
  "totalActions": 3,
  "status": "executing"
}
```

---

## 5. Alert Service (端口 3005)

### 5.1 告警管理

#### GET `/api/alerts`
查询告警列表。

**Query 参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| homeId | string | 家庭 ID（必填） |
| status | string | `active` / `acknowledged` / `resolved`（可选） |
| severity | string | `info` / `warning` / `error` / `critical`（可选） |
| type | string | `device_offline` / `threshold_exceeded` / `rule_execution_failed`（可选） |
| page | number | 默认 1 |
| pageSize | number | 默认 20 |

**响应 data：**
```json
{
  "total": 50,
  "page": 1,
  "pageSize": 20,
  "list": [
    {
      "id": "uuid",
      "homeId": "uuid",
      "deviceId": "uuid",
      "deviceName": "客厅温湿度",
      "ruleId": "uuid | null",
      "alertType": "threshold_exceeded",
      "severity": "warning",
      "title": "温度过高告警",
      "message": "当前温度 32.5°C，超过阈值 30°C",
      "payload": { "actualValue": 32.5, "thresholdValue": 30, "capability": "temperature" },
      "isAcknowledged": false,
      "acknowledgedAt": null,
      "resolvedAt": null,
      "createdAt": "ISO8601"
    }
  ]
}
```

#### GET `/api/alerts/:id`
告警详情。

#### POST `/api/alerts/:id/acknowledge`
确认告警。

#### POST `/api/alerts/:id/resolve`
标记告警已解决。

#### GET `/api/alerts/statistics`
告警统计。

**Query:** `homeId`

**响应 data：**
```json
{
  "total": 100,
  "active": 10,
  "acknowledged": 30,
  "resolved": 60,
  "bySeverity": { "info": 20, "warning": 50, "error": 25, "critical": 5 },
  "byType": { "device_offline": 30, "threshold_exceeded": 50, "rule_execution_failed": 20 },
  "last7Days": [ { "date": "2024-01-01", "count": 10 } ]
}
```

#### WebSocket: `/api/alerts/ws`
实时告警推送。参考 Telemetry Service WebSocket 协议。

### 5.2 通知管理

#### GET `/api/notifications`
获取当前用户通知列表。

**Query:** `page`, `pageSize`, `isRead`

**响应 data：**
```json
{
  "total": 50,
  "unreadCount": 5,
  "list": [
    {
      "id": "uuid",
      "alertId": "uuid",
      "title": "...",
      "message": "...",
      "channel": "in_app",
      "isRead": false,
      "createdAt": "ISO8601"
    }
  ]
}
```

#### GET `/api/notifications/unread-count`
未读通知数量。

#### POST `/api/notifications/:id/read`
标记单条已读。

#### POST `/api/notifications/read-all`
全部标记已读。

### 5.3 内部接口

#### POST `/api/internal/alerts`
内部服务创建告警（需要 `X-Internal-API-Secret` 请求头）。

**请求体：**
```json
{
  "homeId": "uuid",
  "deviceId": "uuid (可选)",
  "ruleId": "uuid (可选)",
  "alertType": "device_offline | threshold_exceeded | rule_execution_failed | device_error",
  "severity": "info | warning | error | critical",
  "title": "...",
  "message": "...",
  "payload": { "...": "..." }
}
```

---

## 6. MQTT Topic 规范

### Topic 命名格式
```
devices/{deviceId}/{action}
```

| Topic | 方向 | QoS | 说明 |
|-------|------|-----|------|
| `devices/{deviceId}/register` | 设备 → 平台 | 1 | 设备注册 |
| `devices/{deviceId}/heartbeat` | 设备 → 平台 | 0 | 心跳（每 30s） |
| `devices/{deviceId}/telemetry` | 设备 → 平台 | 0 | 遥测数据上报 |
| `devices/{deviceId}/events` | 设备 → 平台 | 1 | 设备事件上报 |
| `devices/{deviceId}/commands` | 平台 → 设备 | 1 | 指令下发 |
| `devices/{deviceId}/acks` | 设备 → 平台 | 1 | 指令执行回执 |

### 消息格式

#### register（设备注册）
```json
{
  "serialNumber": "SN-001",
  "deviceType": "switch",
  "firmwareVersion": "v1.0.0",
  "hardwareVersion": "v1.0"
}
```

#### heartbeat（心跳）
```json
{
  "timestamp": 1704067200000,
  "uptimeSeconds": 3600,
  "battery": 95,
  "signalStrength": -65
}
```

#### telemetry（遥测上报）
```json
{
  "timestamp": 1704067200000,
  "data": [
    { "capability": "temperature", "value": 25.5 },
    { "capability": "humidity", "value": 50 }
  ]
}
```

#### commands（指令下发）
```json
{
  "commandId": "uuid",
  "commandType": "set_state",
  "timestamp": 1704067200000,
  "payload": {
    "switch": true,
    "brightness": 80
  }
}
```

#### acks（指令回执）
```json
{
  "commandId": "uuid",
  "success": true,
  "timestamp": 1704067200100,
  "message": "OK",
  "data": { "currentBrightness": 80 }
}
```
