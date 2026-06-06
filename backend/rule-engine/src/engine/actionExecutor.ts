import {
  Action,
  DeviceCommandAction,
  SceneAction,
  NotificationAction,
  DelayAction,
  Scene,
} from '../types';
import { gatewayService, alertService } from '../infrastructure/services';
import { sceneRepository } from '../repositories/sceneRepository';
import { logger } from '../utils/logger';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ActionExecutionResult {
  type: string;
  success: boolean;
  data?: any;
  error?: string;
}

async function executeDeviceCommand(
  action: DeviceCommandAction
): Promise<ActionExecutionResult> {
  try {
    const response = await gatewayService.post(
      `/api/devices/${action.deviceId}/command`,
      {
        command: action.command,
        payload: action.payload,
      }
    );
    return {
      type: action.type,
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    logger.error('Failed to execute device command', {
      deviceId: action.deviceId,
      command: action.command,
      error: error.message,
    });
    return {
      type: action.type,
      success: false,
      error: error.message,
    };
  }
}

async function executeSceneAction(
  action: SceneAction
): Promise<ActionExecutionResult> {
  try {
    const scene = await sceneRepository.findById(action.sceneId);
    if (!scene) {
      return {
        type: action.type,
        success: false,
        error: `Scene ${action.sceneId} not found`,
      };
    }

    if (!scene.isEnabled) {
      return {
        type: action.type,
        success: false,
        error: `Scene ${action.sceneId} is disabled`,
      };
    }

    const results = await executeSceneActions(scene);
    return {
      type: action.type,
      success: results.every((r) => r.success),
      data: results,
    };
  } catch (error: any) {
    logger.error('Failed to execute scene action', {
      sceneId: action.sceneId,
      error: error.message,
    });
    return {
      type: action.type,
      success: false,
      error: error.message,
    };
  }
}

export async function executeSceneActions(
  scene: Scene
): Promise<ActionExecutionResult[]> {
  const results: ActionExecutionResult[] = [];
  const sortedActions = [...scene.actions].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  for (const sceneAction of sortedActions) {
    if (sceneAction.delayMs > 0) {
      await sleep(sceneAction.delayMs);
    }

    try {
      const response = await gatewayService.post(
        `/api/devices/${sceneAction.deviceId}/command`,
        {
          command: sceneAction.actionType,
          payload: sceneAction.payload,
        }
      );
      results.push({
        type: sceneAction.actionType,
        success: true,
        data: response.data,
      });
    } catch (error: any) {
      logger.error('Failed to execute scene device action', {
        sceneId: scene.id,
        deviceId: sceneAction.deviceId,
        actionType: sceneAction.actionType,
        error: error.message,
      });
      results.push({
        type: sceneAction.actionType,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

async function executeNotification(
  action: NotificationAction
): Promise<ActionExecutionResult> {
  try {
    const response = await alertService.post('/api/notifications', {
      channel: action.channel,
      title: action.title,
      message: action.message,
      userId: action.userId,
    });
    return {
      type: action.type,
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    logger.error('Failed to send notification', {
      channel: action.channel,
      error: error.message,
    });
    return {
      type: action.type,
      success: false,
      error: error.message,
    };
  }
}

async function executeDelay(
  action: DelayAction
): Promise<ActionExecutionResult> {
  try {
    await sleep(action.delayMs);
    return {
      type: action.type,
      success: true,
      data: { delayedMs: action.delayMs },
    };
  } catch (error: any) {
    return {
      type: action.type,
      success: false,
      error: error.message,
    };
  }
}

export async function executeAction(
  action: Action
): Promise<ActionExecutionResult> {
  switch (action.type) {
    case 'device_command':
      return executeDeviceCommand(action);
    case 'scene':
      return executeSceneAction(action);
    case 'notification':
      return executeNotification(action);
    case 'delay':
      return executeDelay(action);
    default:
      return {
        type: (action as any).type || 'unknown',
        success: false,
        error: 'Unknown action type',
      };
  }
}

export async function executeActions(
  actions: Action[]
): Promise<ActionExecutionResult[]> {
  const results: ActionExecutionResult[] = [];

  for (const action of actions) {
    const result = await executeAction(action);
    results.push(result);
  }

  return results;
}
