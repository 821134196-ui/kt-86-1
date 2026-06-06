import { Router } from 'express';
import { deviceTypeController, deviceController } from '../controllers/deviceController';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { deviceTypeSchemas, deviceSchemas } from '../validations';

const router = Router();

router.use(authMiddleware);

router.get('/device-types', deviceTypeController.getAllDeviceTypes);
router.post('/device-types', validate(deviceTypeSchemas.create), deviceTypeController.createDeviceType);
router.get('/device-types/:id', deviceTypeController.getDeviceTypeById);
router.put('/device-types/:id', deviceTypeController.updateDeviceType);
router.delete('/device-types/:id', deviceTypeController.deleteDeviceType);

router.get('/devices', deviceController.getDevices);
router.post('/devices', validate(deviceSchemas.create), deviceController.createDevice);
router.get('/devices/:id', deviceController.getDeviceById);
router.put('/devices/:id', validate(deviceSchemas.update), deviceController.updateDevice);
router.delete('/devices/:id', deviceController.deleteDevice);
router.post('/devices/:id/command', validate(deviceSchemas.command), deviceController.sendCommand);

export default router;
