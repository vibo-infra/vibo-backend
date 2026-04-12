import { Router } from 'express';
import { getLaunchMarkets, getOnboardingCities } from './config.controller';

const router = Router();

router.get('/onboarding-cities', getOnboardingCities);
router.get('/launch', getLaunchMarkets);

export default router;
