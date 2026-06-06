import { Request, Response } from 'express';
import { notificationService } from '../services/notificationService';
import { logger } from '../utils/logger';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const { userId, isRead, page, pageSize } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '缺少 userId 参数',
      });
    }

    const { notifications, total, unreadCount } = await notificationService.getNotifications({
      userId: userId as string,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : 20,
    });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
      pagination: {
        page: page ? parseInt(page as string, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : 20,
        total,
      },
    });
  } catch (err) {
    logger.error('Error getting notifications:', err);
    res.status(500).json({
      success: false,
      error: '获取通知列表失败',
      message: (err as Error).message,
    });
  }
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '缺少 userId 参数',
      });
    }

    const notification = await notificationService.markAsRead(id, userId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: '通知不存在或已标记已读',
      });
    }

    res.json({
      success: true,
      data: notification,
      message: '通知已标记已读',
    });
  } catch (err) {
    logger.error('Error marking notification as read:', err);
    res.status(500).json({
      success: false,
      error: '标记通知已读失败',
      message: (err as Error).message,
    });
  }
};

export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '缺少 userId 参数',
      });
    }

    const count = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      data: { count },
      message: `已将 ${count} 条通知标记为已读`,
    });
  } catch (err) {
    logger.error('Error marking all notifications as read:', err);
    res.status(500).json({
      success: false,
      error: '标记所有通知已读失败',
      message: (err as Error).message,
    });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '缺少 userId 参数',
      });
    }

    const count = await notificationService.getUnreadCount(userId as string);

    res.json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (err) {
    logger.error('Error getting unread count:', err);
    res.status(500).json({
      success: false,
      error: '获取未读通知数量失败',
      message: (err as Error).message,
    });
  }
};
