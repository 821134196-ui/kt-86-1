import { Router } from 'express';
import {
  getScenes,
  getSceneById,
  createScene,
  updateScene,
  deleteScene,
  executeScene,
} from '../controllers/sceneController';

const router = Router();

router.get('/', getScenes);
router.post('/', createScene);
router.get('/:id', getSceneById);
router.put('/:id', updateScene);
router.delete('/:id', deleteScene);
router.post('/:id/execute', executeScene);

export default router;
