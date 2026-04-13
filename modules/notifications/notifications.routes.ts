import { Router } from 'express';
import { authenticate } from '../../core/middleware/authenticate';
import * as notificationsController from './notifications.controller';

const router = Router();

router.get('/', authenticate, notificationsController.listNotifications);
router.patch('/read-all', authenticate, notificationsController.markAllRead);
router.patch('/:id/read', authenticate, notificationsController.markRead);
router.delete('/:id', authenticate, notificationsController.deleteNotification);
router.post('/register-device', authenticate, notificationsController.registerDevice);
router.post('/unregister-device', authenticate, notificationsController.unregisterDevice);

export default router;
