import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../utils/errorHandler';
import { ruleRepository } from '../repositories/ruleRepository';
import { ruleEngine } from '../engine/ruleEngine';
import { CreateRuleInput, UpdateRuleInput } from '../types';

export const getRules = asyncHandler(async (req: Request, res: Response) => {
  const { homeId, isEnabled } = req.query;

  const rules = await ruleRepository.findAll(
    homeId as string | undefined,
    isEnabled !== undefined ? isEnabled === 'true' : undefined
  );

  res.json({ data: rules });
});

export const getRuleById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const rule = await ruleRepository.findById(id);
  if (!rule) {
    throw new AppError('Rule not found', 404);
  }

  res.json({ data: rule });
});

export const createRule = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateRuleInput;

  if (!input.homeId || !input.name || !input.triggerConfig || !input.actionConfig) {
    throw new AppError('Missing required fields: homeId, name, triggerConfig, actionConfig', 400);
  }

  const rule = await ruleRepository.create(input);
  await ruleEngine.onRuleCreated(rule);

  res.status(201).json({ data: rule });
});

export const updateRule = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = req.body as UpdateRuleInput;

  const rule = await ruleRepository.update(id, input);
  if (!rule) {
    throw new AppError('Rule not found', 404);
  }

  await ruleEngine.onRuleUpdated(rule);

  res.json({ data: rule });
});

export const deleteRule = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const deleted = await ruleRepository.delete(id);
  if (!deleted) {
    throw new AppError('Rule not found', 404);
  }

  await ruleEngine.onRuleDeleted(id);

  res.status(204).send();
});

export const enableRule = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const rule = await ruleRepository.update(id, { isEnabled: true });
  if (!rule) {
    throw new AppError('Rule not found', 404);
  }

  await ruleEngine.onRuleEnabled(id);

  res.json({ data: rule });
});

export const disableRule = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const rule = await ruleRepository.update(id, { isEnabled: false });
  if (!rule) {
    throw new AppError('Rule not found', 404);
  }

  await ruleEngine.onRuleDisabled(id);

  res.json({ data: rule });
});

export const getRuleExecutions = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit as string || '100', 10);
  const offset = parseInt(req.query.offset as string || '0', 10);

  const rule = await ruleRepository.findById(id);
  if (!rule) {
    throw new AppError('Rule not found', 404);
  }

  const logs = await ruleRepository.findExecutionLogs(id, limit, offset);

  res.json({
    data: logs,
    pagination: { limit, offset, total: logs.length },
  });
});

export const triggerRule = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const rule = await ruleRepository.findById(id);
  if (!rule) {
    throw new AppError('Rule not found', 404);
  }

  await ruleEngine.triggerRuleManually(id, req.body);

  res.json({ message: 'Rule triggered successfully' });
});
