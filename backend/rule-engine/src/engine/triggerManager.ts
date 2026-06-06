import cron from 'node-cron';
import { EventEmitter } from 'events';
import { Rule, Trigger, DeviceStateTrigger, ScheduleTrigger, GeofenceTrigger } from '../types';
import { mqttClient, TelemetryMessage } from '../infrastructure/mqtt';
import { logger } from '../utils/logger';

export interface TriggerEvent {
  ruleId: string;
  trigger: Trigger;
  data: Record<string, any>;
}

class TriggerManager extends EventEmitter {
  private scheduleTasks: Map<string, cron.ScheduledTask> = new Map();
  private deviceStateRules: Map<string, Set<string>> = new Map();
  private rules: Map<string, Rule> = new Map();

  start() {
    mqttClient.on('telemetry', (msg: TelemetryMessage) => {
      this.handleTelemetry(msg);
    });

    mqttClient.on('deviceState', (data: { deviceId: string; state: any }) => {
      this.handleDeviceState(data.deviceId, data.state);
    });

    logger.info('Trigger manager started');
  }

  registerRule(rule: Rule) {
    this.rules.set(rule.id, rule);

    const trigger = rule.triggerConfig;

    if (trigger.type === 'device_state') {
      this.registerDeviceStateTrigger(rule.id, trigger);
    } else if (trigger.type === 'schedule') {
      this.registerScheduleTrigger(rule.id, trigger);
    } else if (trigger.type === 'geofence') {
      this.registerGeofenceTrigger(rule.id, trigger);
    }
  }

  unregisterRule(ruleId: string) {
    const rule = this.rules.get(ruleId);
    if (!rule) return;

    const trigger = rule.triggerConfig;

    if (trigger.type === 'device_state') {
      const key = `${trigger.deviceId}:${trigger.capability}`;
      this.deviceStateRules.get(key)?.delete(ruleId);
    } else if (trigger.type === 'schedule') {
      const task = this.scheduleTasks.get(ruleId);
      if (task) {
        task.stop();
        this.scheduleTasks.delete(ruleId);
      }
    }

    this.rules.delete(ruleId);
    logger.debug('Rule unregistered from triggers', { ruleId });
  }

  updateRule(rule: Rule) {
    this.unregisterRule(rule.id);
    if (rule.isEnabled) {
      this.registerRule(rule);
    }
  }

  private registerDeviceStateTrigger(ruleId: string, trigger: DeviceStateTrigger) {
    const key = `${trigger.deviceId}:${trigger.capability}`;
    if (!this.deviceStateRules.has(key)) {
      this.deviceStateRules.set(key, new Set());
    }
    this.deviceStateRules.get(key)!.add(ruleId);
    logger.debug('Device state trigger registered', { ruleId, deviceId: trigger.deviceId, capability: trigger.capability });
  }

  private registerScheduleTrigger(ruleId: string, trigger: ScheduleTrigger) {
    try {
      const task = cron.schedule(trigger.cron, () => {
        logger.debug('Schedule trigger fired', { ruleId, cron: trigger.cron });
        this.emit('trigger', {
          ruleId,
          trigger,
          data: { type: 'schedule', cron: trigger.cron, firedAt: new Date().toISOString() },
        } as TriggerEvent);
      });

      this.scheduleTasks.set(ruleId, task);
      logger.debug('Schedule trigger registered', { ruleId, cron: trigger.cron });
    } catch (error: any) {
      logger.error('Failed to register schedule trigger', { ruleId, cron: trigger.cron, error: error.message });
    }
  }

  private registerGeofenceTrigger(ruleId: string, trigger: GeofenceTrigger) {
    logger.debug('Geofence trigger registered (placeholder)', { ruleId, geofenceId: trigger.geofenceId });
  }

  private handleTelemetry(msg: TelemetryMessage) {
    const key = `${msg.deviceId}:${msg.capability}`;
    const ruleIds = this.deviceStateRules.get(key);

    if (!ruleIds || ruleIds.size === 0) return;

    for (const ruleId of ruleIds) {
      const rule = this.rules.get(ruleId);
      if (!rule) continue;

      const trigger = rule.triggerConfig as DeviceStateTrigger;
      const matches = this.checkDeviceStateTrigger(trigger, msg.value);

      if (matches) {
        logger.debug('Device state trigger matched', { ruleId, deviceId: msg.deviceId, capability: msg.capability, value: msg.value });
        this.emit('trigger', {
          ruleId,
          trigger,
          data: {
            type: 'device_state',
            deviceId: msg.deviceId,
            capability: msg.capability,
            value: msg.value,
            timestamp: msg.timestamp.toISOString(),
          },
        } as TriggerEvent);
      }
    }
  }

  private handleDeviceState(deviceId: string, state: any) {
    if (!state || typeof state !== 'object') return;

    for (const [capability, value] of Object.entries(state)) {
      const key = `${deviceId}:${capability}`;
      const ruleIds = this.deviceStateRules.get(key);

      if (!ruleIds || ruleIds.size === 0) continue;

      for (const ruleId of ruleIds) {
        const rule = this.rules.get(ruleId);
        if (!rule) continue;

        const trigger = rule.triggerConfig as DeviceStateTrigger;
        const matches = this.checkDeviceStateTrigger(trigger, value);

        if (matches) {
          logger.debug('Device state trigger matched (from state update)', { ruleId, deviceId, capability, value });
          this.emit('trigger', {
            ruleId,
            trigger,
            data: {
              type: 'device_state',
              deviceId,
              capability,
              value,
              timestamp: new Date().toISOString(),
            },
          } as TriggerEvent);
        }
      }
    }
  }

  private checkDeviceStateTrigger(trigger: DeviceStateTrigger, value: any): boolean {
    const { operator, value: expected } = trigger;

    switch (operator) {
      case '>':
        return Number(value) > Number(expected);
      case '<':
        return Number(value) < Number(expected);
      case '>=':
        return Number(value) >= Number(expected);
      case '<=':
        return Number(value) <= Number(expected);
      case '==':
        if (typeof expected === 'boolean') {
          return value === expected || value === String(expected);
        }
        return value == expected;
      case '!=':
        return value != expected;
      case 'in':
        return Array.isArray(expected) && expected.includes(value);
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(value);
      default:
        return false;
    }
  }

  triggerGeofenceEvent(geofenceId: string, action: 'enter' | 'leave', userId?: string) {
    for (const [ruleId, rule] of this.rules.entries()) {
      const trigger = rule.triggerConfig;
      if (trigger.type === 'geofence' && trigger.geofenceId === geofenceId && trigger.action === action) {
        this.emit('trigger', {
          ruleId,
          trigger,
          data: {
            type: 'geofence',
            geofenceId,
            action,
            userId,
            timestamp: new Date().toISOString(),
          },
        } as TriggerEvent);
      }
    }
  }

  shutdown() {
    for (const task of this.scheduleTasks.values()) {
      task.stop();
    }
    this.scheduleTasks.clear();
    this.deviceStateRules.clear();
    this.rules.clear();
    logger.info('Trigger manager shutdown');
  }
}

export const triggerManager = new TriggerManager();
