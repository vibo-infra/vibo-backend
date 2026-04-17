import { Request, Response } from 'express';
import { getOnboardingCitiesPayload } from '../app-config/onboardingCities.service';
import { getLaunchMarketsPublic } from '../app-config/launchMarkets.service';
import { reverseGeocode } from '../geo/reverseGeocode.service';
import { searchPlaces } from '../geo/placeSearch.service';
import { reverseGeocodePlaceDetails } from '../geo/placeDetails.service';

export const getOnboardingCities = async (_req: Request, res: Response) => {
  try {
    const body = await getOnboardingCitiesPayload();
    res.status(200).json(body);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load city catalog' });
  }
};

export const getLaunchMarkets = async (_req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'public, max-age=60');
    const body = await getLaunchMarketsPublic();
    res.status(200).json(body);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load launch config' });
  }
};

/** Public — lat/lng query; rate-limit at edge in production. */
export const getReverseGeocode = async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const geo = await reverseGeocode(lat, lng);
    if (!geo) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }
    res.set('Cache-Control', 'public, max-age=300');
    return res.status(200).json(geo);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Geocode failed' });
  }
};

export const getPlaceSearch = async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const lat = req.query.lat != null ? Number(req.query.lat) : undefined;
    const lng = req.query.lng != null ? Number(req.query.lng) : undefined;
    const hits = await searchPlaces(q, lat, lng);
    res.set('Cache-Control', 'public, max-age=120');
    return res.status(200).json({ results: hits });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Search failed' });
  }
};

export const getPlaceDetails = async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const detail = await reverseGeocodePlaceDetails(lat, lng);
    if (!detail) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }
    res.set('Cache-Control', 'public, max-age=300');
    return res.status(200).json(detail);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Geocode failed' });
  }
};
