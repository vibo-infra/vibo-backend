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
    } = req.body ?? {};
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
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json({ user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};
