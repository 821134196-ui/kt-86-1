import { Router } from 'express';
import authRoutes from './authRoutes';
import homeRoutes from './homeRoutes';
import roomRoutes from './roomRoutes';
import deviceRoutes from './deviceRoutes';
import healthRoutes from './healthRoutes';
import { deviceShareController } from '../controllers/shareController';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { deviceShareSchemas } from '../validations';

const router = Router();

router.use('/auth', authRoutes);
router.use('/homes', homeRoutes);
router.use('/', roomRoutes);
router.use('/', deviceRoutes);
router.use('/', healthRoutes);

router.use(authMiddleware);
router.get('/devices/:id/shares', deviceShareController.getDeviceShares);
router.post('/devices/:id/shares', validate(deviceShareSchemas.create), deviceShareController.createDeviceShare);
router.delete('/devices/:id/shares/:userId', deviceShareController.deleteDeviceShare);

export default router;
