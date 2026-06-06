import {
  Condition,
  ConditionGroup,
  DeviceStateCondition,
  TimeRangeCondition,
  Operator,
} from '../types';
import { timescaleDb } from '../infrastructure/timescaledb';
import { logger } from '../utils/logger';

async function getCurrentDeviceState(
  deviceId: string,
  capability: string
): Promise<any> {
  try {
    const result = await timescaleDb.query(
      `SELECT value, value_string, value_boolean
       FROM device_state_snapshot
       WHERE device_id = $1 AND capability_code = $2`,
      [deviceId, capability]
    );

    if (result.rows.length === 0) {
      return undefined;
    }

    const row = result.rows[0];
    if (row.value_boolean !== null) return row.value_boolean;
    if (row.value !== null) return row.value;
    return row.value_string;
  } catch (error: any) {
    logger.error('Failed to get device state', {
      deviceId,
      capability,
      error: error.message,
    });
    return undefined;
  }
}

function compareValues(
  actual: any,
  operator: Operator,
  expected: any
): boolean {
  if (actual === undefined || actual === null) {
    return false;
  }

  switch (operator) {
    case '>':
      return Number(actual) > Number(expected);
    case '<':
      return Number(actual) < Number(expected);
    case '>=':
      return Number(actual) >= Number(expected);
    case '<=':
      return Number(actual) <= Number(expected);
    case '==':
      if (typeof expected === 'boolean') {
        return actual === expected || actual === String(expected);
      }
      return actual == expected;
    case '!=':
      return actual != expected;
    case 'in':
      return Array.isArray(expected) && expected.includes(actual);
    case 'not_in':
      return Array.isArray(expected) && !expected.includes(actual);
    default:
      return false;
  }
}

function isInTimeRange(from: string, to: string, timezone?: string): boolean {
  try {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const [fromHour, fromMin] = from.split(':').map(Number);
    const [toHour, toMin] = to.split(':').map(Number);

    const fromMinutes = fromHour * 60 + fromMin;
    const toMinutes = toHour * 60 + toMin;

    if (fromMinutes <= toMinutes) {
      return nowMinutes >= fromMinutes && nowMinutes <= toMinutes;
    } else {
      return nowMinutes >= fromMinutes || nowMinutes <= toMinutes;
    }
  } catch (error: any) {
    logger.error('Failed to check time range', { error: error.message });
    return false;
  }
}

function isConditionGroup(cond: any): cond is ConditionGroup {
  return cond && 'logic' in cond && 'conditions' in cond;
}

function isDeviceStateCondition(cond: any): cond is DeviceStateCondition {
  return cond && cond.type === 'device_state';
}

function isTimeRangeCondition(cond: any): cond is TimeRangeCondition {
  return cond && cond.type === 'time_range';
}

async function evaluateDeviceStateCondition(
  condition: DeviceStateCondition
): Promise<boolean> {
  const actualValue = await getCurrentDeviceState(
    condition.deviceId,
    condition.capability
  );
  return compareValues(actualValue, condition.operator, condition.value);
}

async function evaluateSingleCondition(condition: any): Promise<boolean> {
  if (isConditionGroup(condition)) {
    return evaluateConditionGroup(condition);
  }
  if (isDeviceStateCondition(condition)) {
    return evaluateDeviceStateCondition(condition);
  }
  if (isTimeRangeCondition(condition)) {
    return isInTimeRange(condition.from, condition.to, condition.timezone);
  }
  logger.warn('Unknown condition type', { condition });
  return false;
}

export async function evaluateConditionGroup(
  group: ConditionGroup
): Promise<boolean> {
  if (!group.conditions || group.conditions.length === 0) {
    return true;
  }

  const results = await Promise.all(
    group.conditions.map((cond) => evaluateSingleCondition(cond))
  );

  if (group.logic === 'AND') {
    return results.every((r) => r);
  } else {
    return results.some((r) => r);
  }
}

export async function evaluateCondition(
  condition: Condition | null
): Promise<boolean> {
  if (!condition) {
    return true;
  }
  return evaluateConditionGroup(condition);
}
