import { Router } from 'express';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
} from '../controllers/notificationController';

const router = Router();

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/read-all', markAllNotificationsAsRead);
router.post('/:id/read', markNotificationAsRead);

export default router;
