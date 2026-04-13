import { Router } from 'express';
import { authenticate } from '../../core/middleware/authenticate';
import * as notificationsController from './notifications.controller';

const router = Router();

router.get('/', authenticate, notificationsController.listNotifications);
router.patch('/:id/read', authenticate, notificationsController.markRead);
router.post('/register-device', authenticate, notificationsController.registerDevice);
router.post('/unregister-device', authenticate, notificationsController.unregisterDevice);

export default router;
