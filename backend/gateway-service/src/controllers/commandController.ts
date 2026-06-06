import { Request, Response } from 'express';
import commandService from '../services/commandService';
import logger from '../utils/logger';
import { ApiResponse } from '../types';

export async function sendCommand(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { commandType, payload, idempotencyKey } = req.body;

    if (!commandType) {
      res.status(400).json({
        success: false,
        error: 'commandType is required',
      } as ApiResponse);
      return;
    }

    if (!payload || typeof payload !== 'object') {
      res.status(400).json({
        success: false,
        error: 'payload is required and must be an object',
      } as ApiResponse);
      return;
    }

    const createdBy = (req as any).user?.id;

    const command = await commandService.sendCommand(
      id,
      commandType,
      payload,
      idempotencyKey,
      createdBy
    );

    res.status(201).json({
      success: true,
      data: command,
      message: 'Command sent successfully',
    } as ApiResponse);
  } catch (error: any) {
    logger.error('Error sending command:', error);

    if (error.message.includes('offline')) {
      res.status(400).json({
        success: false,
        error: error.message,
      } as ApiResponse);
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to send command',
      message: error.message,
    } as ApiResponse);
  }
}

export async function getCommandStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id, commandId } = req.params;

    const command = await commandService.getCommandById(commandId);

    if (!command) {
      res.status(404).json({
        success: false,
        error: 'Command not found',
      } as ApiResponse);
      return;
    }

    if (command.deviceId !== id) {
      res.status(404).json({
        success: false,
        error: 'Command not found for this device',
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: command,
    } as ApiResponse);
  } catch (error: any) {
    logger.error('Error getting command status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get command status',
      message: error.message,
    } as ApiResponse);
  }
}
