import { Router } from 'express';
import { internalApiAuth, createAlert } from '../controllers/internalController';

const router = Router();

router.post('/alerts', internalApiAuth, createAlert);

export default router;
