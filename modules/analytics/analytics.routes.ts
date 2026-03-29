import { Router } from 'express';
import { internalOnly } from '../../core/middleware/internalOnly';
import * as analyticsController from './analytics.controller';

const router = Router();

// Public — called from landing page and app client
router.post('/events', analyticsController.trackEvents);

// Internal — your ops dashboard only
router.get('/summary',            internalOnly, analyticsController.getSummary);
router.get('/top-elements',       internalOnly, analyticsController.getTopElements);
router.get('/scroll-depth',       internalOnly, analyticsController.getScrollDepth);
router.get('/conversions-source', internalOnly, analyticsController.getConversionsBySource);

export default router;