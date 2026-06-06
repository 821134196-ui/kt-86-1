import { Router } from 'express';
import { healthCheck } from '../controllers/internalController';

const router = Router();

router.get('/', healthCheck);

export default router;
