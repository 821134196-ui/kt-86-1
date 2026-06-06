import { Router } from 'express';
import { roomController, deviceGroupController } from '../controllers/roomController';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { roomSchemas, deviceGroupSchemas } from '../validations';

const router = Router();

router.use(authMiddleware);

router.get('/rooms', roomController.getRooms);
router.post('/rooms', validate(roomSchemas.create), roomController.createRoom);
router.get('/rooms/:id', roomController.getRoomById);
router.put('/rooms/:id', validate(roomSchemas.update), roomController.updateRoom);
router.delete('/rooms/:id', roomController.deleteRoom);

router.get('/device-groups', deviceGroupController.getDeviceGroups);
router.post('/device-groups', validate(deviceGroupSchemas.create), deviceGroupController.createDeviceGroup);
router.get('/device-groups/:id', deviceGroupController.getDeviceGroupById);
router.put('/device-groups/:id', validate(deviceGroupSchemas.update), deviceGroupController.updateDeviceGroup);
router.delete('/device-groups/:id', deviceGroupController.deleteDeviceGroup);

export default router;
