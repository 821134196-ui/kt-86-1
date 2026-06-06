import { Request, Response } from 'express';
import { alertService } from '../services/alertService';
import { AlertListQuery, AlertSeverity, AlertType, ApiResponse } from '../types';
import { logger } from '../utils/logger';

export const getAlerts = async (req: Request, res: Response) => {
  try {
    const { homeId, status, severity, type, page, pageSize } = req.query;

    const queryParams: AlertListQuery = {
      homeId: homeId as string | undefined,
      status: status as AlertListQuery['status'],
      severity: severity as AlertSeverity | undefined,
      type: type as AlertType | undefined,
      page: page ? parseInt(page as string, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : 20,
    };

    const { alerts, total } = await alertService.getAlerts(queryParams);

    const response: ApiResponse = {
      success: true,
      data: alerts,
      pagination: {
        page: queryParams.page!,
        pageSize: queryParams.pageSize!,
        total,
      },
    };

    res.json(response);
  } catch (err) {
    logger.error('Error getting alerts:', err);
    res.status(500).json({
      success: false,
      error: '获取告警列表失败',
      message: (err as Error).message,
    });
  }
};

export const getAlertById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const alert = await alertService.getAlertById(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: '告警不存在',
      });
    }

    res.json({
      success: true,
      data: alert,
    });
  } catch (err) {
    logger.error('Error getting alert:', err);
    res.status(500).json({
      success: false,
      error: '获取告警详情失败',
      message: (err as Error).message,
    });
  }
};

export const acknowledgeAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '缺少 userId 参数',
      });
    }

    const alert = await alertService.acknowledgeAlert(id, userId);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: '告警不存在或已确认',
      });
    }

    res.json({
      success: true,
      data: alert,
      message: '告警已确认',
    });
  } catch (err) {
    logger.error('Error acknowledging alert:', err);
    res.status(500).json({
      success: false,
      error: '确认告警失败',
      message: (err as Error).message,
    });
  }
};

export const resolveAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const alert = await alertService.resolveAlert(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: '告警不存在或已解决',
      });
    }

    res.json({
      success: true,
      data: alert,
      message: '告警已解决',
    });
  } catch (err) {
    logger.error('Error resolving alert:', err);
    res.status(500).json({
      success: false,
      error: '解决告警失败',
      message: (err as Error).message,
    });
  }
};

export const getStatistics = async (req: Request, res: Response) => {
  try {
    const { homeId } = req.query;
    const statistics = await alertService.getStatistics(homeId as string | undefined);

    res.json({
      success: true,
      data: statistics,
    });
  } catch (err) {
    logger.error('Error getting statistics:', err);
    res.status(500).json({
      success: false,
      error: '获取告警统计失败',
      message: (err as Error).message,
    });
  }
};
