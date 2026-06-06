import { query } from '../config/database';
import { logger } from '../utils/logger';
import {
  CreateNotificationRequest,
  Notification,
  NotificationListQuery,
} from '../types';
import { wsService } from './websocketService';

class NotificationService {
  public async createNotification(request: CreateNotificationRequest): Promise<Notification> {
    const { userId, alertId, title, message, channel = 'in_app' } = request;

    const result = await query(
      `INSERT INTO notifications (user_id, alert_id, title, message, channel)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, alertId || null, title, message || null, channel]
    );

    const notification = this.mapRowToNotification(result.rows[0]);

    wsService.publishNotificationToRedis(notification);
    wsService.broadcastNotification(notification);

    if (channel === 'email') {
      this.sendEmailNotification(notification);
    }

    logger.debug(`Notification created: ${notification.id} for user ${userId}`);

    return notification;
  }

  private async sendEmailNotification(notification: Notification): Promise<void> {
    logger.info(`[Email Placeholder] Would send email to user ${notification.user_id}: ${notification.title}`);
  }

  public async getNotifications(queryParams: NotificationListQuery): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    const { userId, isRead, page = 1, pageSize = 20 } = queryParams;

    const conditions: string[] = ['user_id = $1'];
    const params: any[] = [userId];
    let paramIndex = 2;

    if (isRead !== undefined) {
      conditions.push(`is_read = $${paramIndex++}`);
      params.push(isRead);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await query(
      `SELECT COUNT(*) FROM notifications ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const unreadResult = await query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    const unreadCount = parseInt(unreadResult.rows[0].count, 10);

    const offset = (page - 1) * pageSize;
    const dataResult = await query(
      `SELECT * FROM notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, pageSize, offset]
    );

    const notifications = dataResult.rows.map(this.mapRowToNotification);

    return { notifications, total, unreadCount };
  }

  public async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const result = await query(
      `UPDATE notifications
       SET is_read = true,
           read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND is_read = false
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const notification = this.mapRowToNotification(result.rows[0]);
    logger.debug(`Notification ${id} marked as read`);
    return notification;
  }

  public async markAllAsRead(userId: string): Promise<number> {
    const result = await query(
      `UPDATE notifications
       SET is_read = true,
           read_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    const count = result.rowCount || 0;
    logger.info(`Marked ${count} notifications as read for user ${userId}`);
    return count;
  }

  public async getUnreadCount(userId: string): Promise<number> {
    const result = await query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  private mapRowToNotification(row: any): Notification {
    return {
      id: row.id,
      user_id: row.user_id,
      alert_id: row.alert_id,
      title: row.title,
      message: row.message,
      channel: row.channel,
      is_read: row.is_read,
      read_at: row.read_at,
      created_at: row.created_at,
    };
  }
}

export const notificationService = new NotificationService();
