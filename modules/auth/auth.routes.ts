import { Router } from 'express';
import * as authController from './auth.controller';

const router = Router();

router.post('/register', authController.register);
router.post('/login',    authController.login);
router.post('/logout',   authController.logout);
router.post('/refresh', authController.refreshToken);


export default router;