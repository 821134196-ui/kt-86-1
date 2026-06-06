import { Router } from 'express';
import { homeController } from '../controllers/homeController';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { homeSchemas } from '../validations';

const router = Router();

router.use(authMiddleware);

router.get('/', homeController.getUserHomes);
router.post('/', validate(homeSchemas.create), homeController.createHome);
router.get('/:id', homeController.getHomeById);
router.put('/:id', validate(homeSchemas.update), homeController.updateHome);
router.delete('/:id', homeController.deleteHome);

router.get('/:id/members', homeController.getMembers);
router.post('/:id/members', validate(homeSchemas.addMember), homeController.addMember);
router.delete('/:id/members/:userId', homeController.removeMember);

export default router;
