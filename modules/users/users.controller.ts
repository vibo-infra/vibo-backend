import { Request, Response } from 'express';
import * as usersService from './users.service';

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await usersService.getPublicAuthUser(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json({ user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
};

export const patchMe = async (req: Request, res: Response) => {
  try {
    const {
      defaultCity,
      firstName,
      pushNotificationsEnabled,
      inAppNotificationsEnabled,
      appPreferences,
      lastKnownLocation,
    } = req.body ?? {};
    const loc =
      lastKnownLocation && typeof lastKnownLocation === 'object' && lastKnownLocation !== null
        ? (lastKnownLocation as { latitude?: unknown; longitude?: unknown })
        : null;
    const user = await usersService.updateMe(req.user.userId, {
      defaultCity: defaultCity !== undefined ? String(defaultCity).trim() || null : undefined,
      firstName: firstName !== undefined ? String(firstName).trim() : undefined,
      pushNotificationsEnabled:
        typeof pushNotificationsEnabled === 'boolean' ? pushNotificationsEnabled : undefined,
      inAppNotificationsEnabled:
        typeof inAppNotificationsEnabled === 'boolean' ? inAppNotificationsEnabled : undefined,
      appPreferences:
        appPreferences !== undefined && typeof appPreferences === 'object' && appPreferences !== null
          ? (appPreferences as Record<string, unknown>)
          : undefined,
      lastKnownLatitude:
        loc && typeof loc.latitude === 'number'
          ? loc.latitude
          : loc && typeof loc.latitude === 'string'
            ? Number(loc.latitude)
            : undefined,
      lastKnownLongitude:
        loc && typeof loc.longitude === 'number'
          ? loc.longitude
          : loc && typeof loc.longitude === 'string'
            ? Number(loc.longitude)
            : undefined,
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json({ user });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'INVALID_DEFAULT_CITY') {
      return res.status(400).json({ error: 'That city is not available yet' });
    }
    if (msg === 'DEFAULT_CITY_REQUIRED') {
      return res.status(400).json({ error: 'City is required' });
    }
    if (msg === 'INVALID_LAST_KNOWN_LOCATION') {
      return res.status(400).json({ error: 'Invalid last known location' });
    }
    console.error(e);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};
