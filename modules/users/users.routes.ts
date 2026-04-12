import { Router } from 'express';
import { authenticate } from '../../core/middleware/authenticate';
import * as usersController from './users.controller';

const router = Router();

router.get('/me', authenticate, usersController.getMe);
router.patch('/me', authenticate, usersController.patchMe);

export default router;
