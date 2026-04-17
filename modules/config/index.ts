import { Router } from 'express';
import {
  getLaunchMarkets,
  getOnboardingCities,
  getReverseGeocode,
  getPlaceSearch,
  getPlaceDetails,
} from './config.controller';

const router = Router();

router.get('/onboarding-cities', getOnboardingCities);
router.get('/launch', getLaunchMarkets);
router.get('/reverse-geocode', getReverseGeocode);
router.get('/place-search', getPlaceSearch);
router.get('/place-details', getPlaceDetails);

export default router;
