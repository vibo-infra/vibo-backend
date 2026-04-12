import { Router } from 'express';
import { authenticate } from '../../core/middleware/authenticate';
import * as sparkController from './spark.controller';

const router = Router();

router.get('/balance', authenticate, sparkController.getBalance);
router.get('/transactions', authenticate, sparkController.listTransactions);

export default router;
