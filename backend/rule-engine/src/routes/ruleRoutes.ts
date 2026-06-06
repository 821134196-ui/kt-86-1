import { Router } from 'express';
import {
  getRules,
  getRuleById,
  createRule,
  updateRule,
  deleteRule,
  enableRule,
  disableRule,
  getRuleExecutions,
  triggerRule,
} from '../controllers/ruleController';

const router = Router();

router.get('/', getRules);
router.post('/', createRule);
router.get('/:id', getRuleById);
router.put('/:id', updateRule);
router.delete('/:id', deleteRule);
router.post('/:id/enable', enableRule);
router.post('/:id/disable', disableRule);
router.get('/:id/executions', getRuleExecutions);
router.post('/:id/trigger', triggerRule);

export default router;
