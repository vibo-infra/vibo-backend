import { Router } from 'express';
import { authenticate } from '../../core/middleware/authenticate';
import * as eventsController from './events.controller';

const router = Router();

// Public — anyone can browse events
router.get('/',     eventsController.getEventsByLocation);
router.get('/:id',  eventsController.getEventById);

// Protected — must be logged in to host
router.post('/', authenticate, eventsController.createEvent);

export default router;