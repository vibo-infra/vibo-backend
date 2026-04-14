import { Router } from 'express';
import { authenticate } from '../../core/middleware/authenticate';
import { authenticateOptional } from '../../core/middleware/authenticateOptional';
import * as eventsController from './events.controller';

const router = Router();

router.get('/categories', eventsController.listCategories);

/** Prefer this path in clients — avoids `/me/...` being mishandled by proxies or mistaken for `/:id`. */
router.get('/upcoming', authenticate, eventsController.getMyUpcomingEvents);
router.get('/me/all', authenticate, eventsController.getMyAllEvents);

router.get('/me/upcoming', authenticate, eventsController.getMyUpcomingEvents);

router.get(
  '/hosts/:hostId/profile',
  authenticateOptional,
  eventsController.getHostPublicProfile
);

router.get('/', authenticateOptional, eventsController.getEventsByLocation);

router.get('/:id/reviews', eventsController.getEventReviews);
router.post('/:id/reviews', authenticate, eventsController.postEventReview);

router.post('/:id/register', authenticate, eventsController.registerForEvent);
router.delete('/:id', authenticate, eventsController.deleteEventAsHost);

router.post('/:id/like', authenticate, eventsController.toggleEventLike);

router.get('/:id', authenticateOptional, eventsController.getEventById);

router.post('/', authenticate, eventsController.createEvent);

export default router;
