import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../utils/errorHandler';
import { sceneRepository } from '../repositories/sceneRepository';
import { executeSceneActions } from '../engine/actionExecutor';
import { CreateSceneInput, UpdateSceneInput } from '../types';
import { logger } from '../utils/logger';

export const getScenes = asyncHandler(async (req: Request, res: Response) => {
  const { homeId, isEnabled } = req.query;

  const scenes = await sceneRepository.findAll(
    homeId as string | undefined,
    isEnabled !== undefined ? isEnabled === 'true' : undefined
  );

  res.json({ data: scenes });
});

export const getSceneById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const scene = await sceneRepository.findById(id);
  if (!scene) {
    throw new AppError('Scene not found', 404);
  }

  res.json({ data: scene });
});

export const createScene = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateSceneInput;

  if (!input.homeId || !input.name || !input.actions) {
    throw new AppError('Missing required fields: homeId, name, actions', 400);
  }

  const scene = await sceneRepository.create(input);
  res.status(201).json({ data: scene });
});

export const updateScene = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = req.body as UpdateSceneInput;

  const scene = await sceneRepository.update(id, input);
  if (!scene) {
    throw new AppError('Scene not found', 404);
  }

  res.json({ data: scene });
});

export const deleteScene = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const deleted = await sceneRepository.delete(id);
  if (!deleted) {
    throw new AppError('Scene not found', 404);
  }

  res.status(204).send();
});

export const executeScene = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const scene = await sceneRepository.findById(id);
  if (!scene) {
    throw new AppError('Scene not found', 404);
  }

  if (!scene.isEnabled) {
    throw new AppError('Scene is disabled', 400);
  }

  logger.info('Executing scene', { sceneId: scene.id, sceneName: scene.name });

  const results = await executeSceneActions(scene);
  const hasFailures = results.some((r) => !r.success);

  res.json({
    data: {
      sceneId: scene.id,
      executed: true,
      hasFailures,
      results,
    },
  });
});
