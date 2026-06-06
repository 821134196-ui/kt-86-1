import { Router } from 'express';
import {
  getAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
  getStatistics,
} from '../controllers/alertController';

const router = Router();

router.get('/', getAlerts);
router.get('/statistics', getStatistics);
router.get('/:id', getAlertById);
router.post('/:id/acknowledge', acknowledgeAlert);
router.post('/:id/resolve', resolveAlert);

export default router;
