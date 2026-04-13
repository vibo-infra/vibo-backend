import { Router } from 'express';
import { authenticate } from '../../core/middleware/authenticate';
import * as usersController from './users.controller';
import * as userProfileController from './userProfile.controller';

const router = Router();

/** Account + app session (email, sparks, prefs, city, first name snapshot). */
router.get('/me', authenticate, usersController.getMe);
router.patch('/me', authenticate, usersController.patchMe);

/** Display profile row (name, avatar, bio) — `profile` table only. */
router.get('/me/profile', authenticate, userProfileController.getMyProfile);
router.patch('/me/profile', authenticate, userProfileController.patchMyProfile);

export default router;
