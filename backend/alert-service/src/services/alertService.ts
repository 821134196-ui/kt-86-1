import { query } from '../config/database';
import { logger } from '../utils/logger';
import {
  Alert,
  AlertSeverity,
  AlertStatistics,
  AlertType,
  CreateAlertRequest,
  AlertListQuery,
} from '../types';
import { notificationService } from './notificationService';
import { wsService } from './websocketService';

class AlertService {
  public async createAlert(request: CreateAlertRequest): Promise<Alert> {
    const { homeId, deviceId, ruleId, alertType, severity, title, message, payload } = request;

    logger.info(`Creating alert: type=${alertType}, severity=${severity}, home=${homeId}`);

    const result = await query(
      `INSERT INTO alerts (home_id, device_id, rule_id, alert_type, severity, title, message, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [homeId, deviceId || null, ruleId || null, alertType, severity, title, message || null, payload || {}]
    );

    const alert = this.mapRowToAlert(result.rows[0]);

    await this.createNotificationsForAlert(alert);

    wsService.publishAlertToRedis(alert);
    wsService.broadcastAlert(alert);

    logger.info(`Alert created: ${alert.id}`);

    return alert;
  }

  private async createNotificationsForAlert(alert: Alert): Promise<void> {
    try {
      const membersResult = await query(
        `SELECT user_id FROM home_members WHERE home_id = $1`,
        [alert.home_id]
      );

      for (const row of membersResult.rows) {
        await notificationService.createNotification({
          userId: row.user_id,
          alertId: alert.id,
          title: alert.title,
          message: alert.message,
          channel: 'in_app',
        });
      }

      logger.debug(`Created notifications for alert ${alert.id} to ${membersResult.rows.length} users`);
    } catch (err) {
      logger.error(`Error creating notifications for alert ${alert.id}:`, err);
    }
  }

  public async getAlerts(queryParams: AlertListQuery): Promise<{ alerts: Alert[]; total: number }> {
    const { homeId, status, severity, type, page = 1, pageSize = 20 } = queryParams;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (homeId) {
      conditions.push(`a.home_id = $${paramIndex++}`);
      params.push(homeId);
    }

    if (severity) {
      conditions.push(`a.severity = $${paramIndex++}`);
      params.push(severity);
    }

    if (type) {
      conditions.push(`a.alert_type = $${paramIndex++}`);
      params.push(type);
    }

    if (status === 'active') {
      conditions.push(`a.is_acknowledged = false AND a.resolved_at IS NULL`);
    } else if (status === 'acknowledged') {
      conditions.push(`a.is_acknowledged = true AND a.resolved_at IS NULL`);
    } else if (status === 'resolved') {
      conditions.push(`a.resolved_at IS NOT NULL`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM alerts a ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const offset = (page - 1) * pageSize;
    const dataResult = await query(
      `SELECT a.*, d.name as device_name
       FROM alerts a
       LEFT JOIN devices d ON a.device_id = d.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, pageSize, offset]
    );

    const alerts = dataResult.rows.map((row) => {
      const alert = this.mapRowToAlert(row);
      return { ...alert, device_name: row.device_name } as Alert & { device_name?: string };
    });

    return { alerts, total };
  }

  public async getAlertById(id: string): Promise<Alert | null> {
    const result = await query(
      `SELECT a.*, d.name as device_name
       FROM alerts a
       LEFT JOIN devices d ON a.device_id = d.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const alert = this.mapRowToAlert(result.rows[0]);
    return { ...alert, device_name: result.rows[0].device_name } as Alert & { device_name?: string };
  }

  public async acknowledgeAlert(id: string, acknowledgedBy: string): Promise<Alert | null> {
    const result = await query(
      `UPDATE alerts
       SET is_acknowledged = true,
           acknowledged_by = $1,
           acknowledged_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND is_acknowledged = false
       RETURNING *`,
      [acknowledgedBy, id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const alert = this.mapRowToAlert(result.rows[0]);
    logger.info(`Alert ${id} acknowledged by user ${acknowledgedBy}`);
    return alert;
  }

  public async resolveAlert(id: string): Promise<Alert | null> {
    const result = await query(
      `UPDATE alerts
       SET resolved_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND resolved_at IS NULL
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const alert = this.mapRowToAlert(result.rows[0]);
    logger.info(`Alert ${id} resolved`);
    return alert;
  }

  public async getStatistics(homeId?: string): Promise<AlertStatistics> {
    const params: any[] = [];
    let whereClause = '';

    if (homeId) {
      whereClause = 'WHERE home_id = $1';
      params.push(homeId);
    }

    const totalResult = await query(
      `SELECT COUNT(*) FROM alerts ${whereClause}`,
      params
    );
    const activeResult = await query(
      `SELECT COUNT(*) FROM alerts ${whereClause} ${whereClause ? 'AND' : 'WHERE'} is_acknowledged = false AND resolved_at IS NULL`,
      params
    );
    const acknowledgedResult = await query(
      `SELECT COUNT(*) FROM alerts ${whereClause} ${whereClause ? 'AND' : 'WHERE'} is_acknowledged = true AND resolved_at IS NULL`,
      params
    );
    const resolvedResult = await query(
      `SELECT COUNT(*) FROM alerts ${whereClause} ${whereClause ? 'AND' : 'WHERE'} resolved_at IS NOT NULL`,
      params
    );

    const todayResult = await query(
      `SELECT COUNT(*) FROM alerts ${whereClause} ${whereClause ? 'AND' : 'WHERE'} created_at >= CURRENT_DATE`,
      params
    );

    const bySeverityResult = await query(
      `SELECT severity, COUNT(*) as count FROM alerts ${whereClause} GROUP BY severity`,
      params
    );

    const byTypeResult = await query(
      `SELECT alert_type, COUNT(*) as count FROM alerts ${whereClause} GROUP BY alert_type`,
      params
    );

    const bySeverity: Record<AlertSeverity, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };
    for (const row of bySeverityResult.rows) {
      bySeverity[row.severity as AlertSeverity] = parseInt(row.count, 10);
    }

    const byType: Record<AlertType, number> = {
      device_offline: 0,
      threshold_exceeded: 0,
      rule_execution_failed: 0,
      device_error: 0,
    };
    for (const row of byTypeResult.rows) {
      byType[row.alert_type as AlertType] = parseInt(row.count, 10);
    }

    return {
      total: parseInt(totalResult.rows[0].count, 10),
      active: parseInt(activeResult.rows[0].count, 10),
      acknowledged: parseInt(acknowledgedResult.rows[0].count, 10),
      resolved: parseInt(resolvedResult.rows[0].count, 10),
      bySeverity,
      byType,
      todayCount: parseInt(todayResult.rows[0].count, 10),
    };
  }

  private mapRowToAlert(row: any): Alert {
    return {
      id: row.id,
      home_id: row.home_id,
      device_id: row.device_id,
      rule_id: row.rule_id,
      alert_type: row.alert_type,
      severity: row.severity,
      title: row.title,
      message: row.message,
      payload: row.payload,
      is_acknowledged: row.is_acknowledged,
      acknowledged_by: row.acknowledged_by,
      acknowledged_at: row.acknowledged_at,
      resolved_at: row.resolved_at,
      created_at: row.created_at,
    };
  }
}

export const alertService = new AlertService();
