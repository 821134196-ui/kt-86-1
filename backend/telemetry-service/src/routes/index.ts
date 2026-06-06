import { Router } from 'express';
import {
  getDeviceTelemetry,
  getDeviceLatest,
  getDeviceThresholds,
  setDeviceThresholds,
  getHealth,
  getAggregated,
  getWsInfo,
} from '../controllers/telemetry.controller';

const router = Router();

router.get('/devices/:deviceId', getDeviceTelemetry);
router.get('/devices/:deviceId/latest', getDeviceLatest);
router.get('/devices/:deviceId/thresholds', getDeviceThresholds);
router.post('/devices/:deviceId/thresholds', setDeviceThresholds);
router.get('/devices/:deviceId/aggregated', getAggregated);
router.get('/ws', getWsInfo);
router.get('/health', getHealth);

export default router;
