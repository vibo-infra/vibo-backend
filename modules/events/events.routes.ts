import { Router } from 'express';
import { authenticate } from '../../core/middleware/authenticate';
import * as eventsController from './events.controller';

const router = Router();

router.get('/categories', eventsController.listCategories);

/** Prefer this path in clients — avoids `/me/...` being mishandled by proxies or mistaken for `/:id`. */
router.get('/upcoming', authenticate, eventsController.getMyUpcomingEvents);

router.get('/me/upcoming', authenticate, eventsController.getMyUpcomingEvents);

router.get('/', eventsController.getEventsByLocation);

router.get('/:id/reviews', eventsController.getEventReviews);
router.post('/:id/reviews', authenticate, eventsController.postEventReview);

router.get('/:id', eventsController.getEventById);

router.post('/', authenticate, eventsController.createEvent);

export default router;
