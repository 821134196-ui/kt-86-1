import { Router } from 'express';
import { sendCommand, getCommandStatus } from '../controllers/commandController';

const router = Router();

router.post('/devices/:id/commands', sendCommand);
router.get('/devices/:id/commands/:commandId', getCommandStatus);

export default router;
