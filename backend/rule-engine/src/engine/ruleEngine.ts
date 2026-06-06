import { Rule, RuleStatus } from '../types';
import { triggerManager, TriggerEvent } from './triggerManager';
import { evaluateCondition } from './conditionEvaluator';
import { executeActions, ActionExecutionResult } from './actionExecutor';
import { ruleRepository } from '../repositories/ruleRepository';
import { logger } from '../utils/logger';

class RuleEngine {
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  async start() {
    if (this.isRunning) return;

    logger.info('Starting rule engine...');

    triggerManager.on('trigger', (event: TriggerEvent) => {
      this.handleTrigger(event);
    });

    triggerManager.start();

    const rules = await ruleRepository.findEnabled();
    for (const rule of rules) {
      triggerManager.registerRule(rule);
    }

    this.isRunning = true;
    logger.info(`Rule engine started with ${rules.length} enabled rules`);
  }

  async handleTrigger(event: TriggerEvent) {
    const { ruleId, data: triggerData } = event;

    logger.info('Trigger received', { ruleId, triggerType: triggerData.type });

    try {
      const rule = await ruleRepository.findById(ruleId);
      if (!rule || !rule.isEnabled) {
        logger.debug('Rule not found or disabled, skipping', { ruleId });
        return;
      }

      if (rule.debounceMs > 0) {
        const pendingTimer = this.debounceTimers.get(ruleId);
        if (pendingTimer) {
          clearTimeout(pendingTimer);
          logger.debug('Debounce: clearing previous timer', { ruleId });
        }

        this.debounceTimers.set(
          ruleId,
          setTimeout(() => {
            this.debounceTimers.delete(ruleId);
            this.executeRule(rule, triggerData);
          }, rule.debounceMs)
        );
        return;
      }

      await this.executeRule(rule, triggerData);
    } catch (error: any) {
      logger.error('Error handling trigger', { ruleId, error: error.message });
    }
  }

  private async executeRule(rule: Rule, triggerData: Record<string, any>) {
    const startTime = Date.now();
    let status: RuleStatus = 'success';
    let conditionResult: boolean | null = null;
    let actionsExecuted: ActionExecutionResult[] = [];
    let errorMessage: string | undefined;

    logger.info('Executing rule', { ruleId: rule.id, ruleName: rule.name });

    try {
      conditionResult = await evaluateCondition(rule.conditionConfig);

      if (!conditionResult) {
        logger.info('Rule condition not met, skipping actions', { ruleId: rule.id });
        status = 'skipped';
      } else {
        logger.info('Rule condition met, executing actions', { ruleId: rule.id });
        actionsExecuted = await executeActions(rule.actionConfig);

        const hasFailures = actionsExecuted.some((r) => !r.success);
        if (hasFailures) {
          status = 'failed';
          errorMessage = 'Some actions failed to execute';
        }

        await ruleRepository.updateLastTriggered(rule.id);
      }
    } catch (error: any) {
      logger.error('Rule execution error', { ruleId: rule.id, error: error.message });
      status = 'failed';
      errorMessage = error.message;
    }

    const executionTimeMs = Date.now() - startTime;

    try {
      await ruleRepository.createExecutionLog(
        rule.id,
        triggerData,
        conditionResult,
        actionsExecuted,
        status,
        executionTimeMs,
        errorMessage
      );
    } catch (logError: any) {
      logger.error('Failed to create execution log', { ruleId: rule.id, error: logError.message });
    }

    logger.info('Rule execution completed', {
      ruleId: rule.id,
      status,
      executionTimeMs,
      conditionResult,
    });
  }

  async triggerRuleManually(ruleId: string, triggerData?: Record<string, any>) {
    const rule = await ruleRepository.findById(ruleId);
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    const data = triggerData || {
      type: 'manual',
      triggeredBy: 'api',
      timestamp: new Date().toISOString(),
    };

    await this.executeRule(rule, data);
  }

  async onRuleCreated(rule: Rule) {
    if (rule.isEnabled) {
      triggerManager.registerRule(rule);
    }
  }

  async onRuleUpdated(rule: Rule) {
    triggerManager.updateRule(rule);
  }

  async onRuleDeleted(ruleId: string) {
    triggerManager.unregisterRule(ruleId);

    const timer = this.debounceTimers.get(ruleId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(ruleId);
    }
  }

  async onRuleEnabled(ruleId: string) {
    const rule = await ruleRepository.findById(ruleId);
    if (rule) {
      triggerManager.registerRule(rule);
    }
  }

  async onRuleDisabled(ruleId: string) {
    triggerManager.unregisterRule(ruleId);

    const timer = this.debounceTimers.get(ruleId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(ruleId);
    }
  }

  async shutdown() {
    if (!this.isRunning) return;

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    triggerManager.shutdown();
    this.isRunning = false;
    logger.info('Rule engine shutdown');
  }
}

export const ruleEngine = new RuleEngine();
