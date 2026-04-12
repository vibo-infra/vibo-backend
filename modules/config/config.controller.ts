import { Request, Response } from 'express';
import { getOnboardingCitiesPayload } from '../app-config/onboardingCities.service';
import { getLaunchMarketsPublic } from '../app-config/launchMarkets.service';

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
