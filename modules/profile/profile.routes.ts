import { Router } from 'express';
import { authenticate } from '../../core/middleware/authenticate';
import * as profileController from './profile.controller';

const router = Router();

router.get('/', authenticate, profileController.getProfile);
router.patch('/', authenticate, profileController.patchProfile);

export default router;
