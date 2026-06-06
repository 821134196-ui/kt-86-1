import { db } from '../infrastructure/database';
import {
  Rule,
  CreateRuleInput,
  UpdateRuleInput,
  RuleExecutionLog,
  RuleStatus,
} from '../types';
import { logger } from '../utils/logger';

const ruleFields = `
  id, home_id, name, description, is_enabled, priority,
  trigger_config, condition_config, action_config, debounce_ms,
  last_triggered_at, created_by, created_at, updated_at
`;

function mapRuleRow(row: any): Rule {
  return {
    id: row.id,
    homeId: row.home_id,
    name: row.name,
    description: row.description,
    isEnabled: row.is_enabled,
    priority: row.priority,
    triggerConfig: row.trigger_config,
    conditionConfig: row.condition_config,
    actionConfig: row.action_config,
    debounceMs: row.debounce_ms,
    lastTriggeredAt: row.last_triggered_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapExecutionLogRow(row: any): RuleExecutionLog {
  return {
    id: row.id,
    ruleId: row.rule_id,
    triggerData: row.trigger_data,
    conditionResult: row.condition_result,
    actionsExecuted: row.actions_executed,
    status: row.status as RuleStatus,
    errorMessage: row.error_message,
    executionTimeMs: row.execution_time_ms,
    createdAt: row.created_at,
  };
}

export class RuleRepository {
  async findAll(homeId?: string, isEnabled?: boolean): Promise<Rule[]> {
    let query = `SELECT ${ruleFields} FROM rules WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (homeId) {
      query += ` AND home_id = $${paramIndex++}`;
      params.push(homeId);
    }

    if (isEnabled !== undefined) {
      query += ` AND is_enabled = $${paramIndex++}`;
      params.push(isEnabled);
    }

    query += ' ORDER BY priority DESC, created_at DESC';

    const result = await db.query(query, params);
    return result.rows.map(mapRuleRow);
  }

  async findById(id: string): Promise<Rule | null> {
    const result = await db.query(
      `SELECT ${ruleFields} FROM rules WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? mapRuleRow(result.rows[0]) : null;
  }

  async findEnabled(): Promise<Rule[]> {
    const result = await db.query(
      `SELECT ${ruleFields} FROM rules WHERE is_enabled = true ORDER BY priority DESC`
    );
    return result.rows.map(mapRuleRow);
  }

  async create(input: CreateRuleInput): Promise<Rule> {
    const result = await db.query(
      `INSERT INTO rules (
        home_id, name, description, is_enabled, priority,
        trigger_config, condition_config, action_config, debounce_ms, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING ${ruleFields}`,
      [
        input.homeId,
        input.name,
        input.description || null,
        input.isEnabled !== undefined ? input.isEnabled : true,
        input.priority || 0,
        JSON.stringify(input.triggerConfig),
        input.conditionConfig ? JSON.stringify(input.conditionConfig) : null,
        JSON.stringify(input.actionConfig),
        input.debounceMs || 0,
        input.createdBy || null,
      ]
    );
    return mapRuleRow(result.rows[0]);
  }

  async update(id: string, input: UpdateRuleInput): Promise<Rule | null> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      params.push(input.name);
    }
    if (input.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      params.push(input.description);
    }
    if (input.isEnabled !== undefined) {
      fields.push(`is_enabled = $${paramIndex++}`);
      params.push(input.isEnabled);
    }
    if (input.priority !== undefined) {
      fields.push(`priority = $${paramIndex++}`);
      params.push(input.priority);
    }
    if (input.triggerConfig !== undefined) {
      fields.push(`trigger_config = $${paramIndex++}`);
      params.push(JSON.stringify(input.triggerConfig));
    }
    if (input.conditionConfig !== undefined) {
      fields.push(`condition_config = $${paramIndex++}`);
      params.push(input.conditionConfig ? JSON.stringify(input.conditionConfig) : null);
    }
    if (input.actionConfig !== undefined) {
      fields.push(`action_config = $${paramIndex++}`);
      params.push(JSON.stringify(input.actionConfig));
    }
    if (input.debounceMs !== undefined) {
      fields.push(`debounce_ms = $${paramIndex++}`);
      params.push(input.debounceMs);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await db.query(
      `UPDATE rules SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING ${ruleFields}`,
      params
    );

    return result.rows[0] ? mapRuleRow(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.query('DELETE FROM rules WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }

  async updateLastTriggered(id: string): Promise<void> {
    await db.query(
      'UPDATE rules SET last_triggered_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  }

  async createExecutionLog(
    ruleId: string,
    triggerData: Record<string, any>,
    conditionResult: boolean | null,
    actionsExecuted: Record<string, any>[],
    status: RuleStatus,
    executionTimeMs: number,
    errorMessage?: string
  ): Promise<RuleExecutionLog> {
    const result = await db.query(
      `INSERT INTO rule_execution_logs (
        rule_id, trigger_data, condition_result, actions_executed,
        status, error_message, execution_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, rule_id, trigger_data, condition_result, actions_executed,
        status, error_message, execution_time_ms, created_at`,
      [
        ruleId,
        JSON.stringify(triggerData),
        conditionResult,
        JSON.stringify(actionsExecuted),
        status,
        errorMessage || null,
        executionTimeMs,
      ]
    );
    return mapExecutionLogRow(result.rows[0]);
  }

  async findExecutionLogs(
    ruleId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<RuleExecutionLog[]> {
    const result = await db.query(
      `SELECT id, rule_id, trigger_data, condition_result, actions_executed,
        status, error_message, execution_time_ms, created_at
       FROM rule_execution_logs
       WHERE rule_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [ruleId, limit, offset]
    );
    return result.rows.map(mapExecutionLogRow);
  }
}

export const ruleRepository = new RuleRepository();
