import { Request, Response } from 'express';
import * as profileService from './profile.service';

export const getProfile = async (req: Request, res: Response) => {
  try {
    const profile = await profileService.getProfile(req.user.userId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    return res.status(200).json({ profile });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
};

export const patchProfile = async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const profile = await profileService.updateProfile(req.user.userId, {
      firstName: body.firstName,
      lastName: body.lastName,
      avatarUrl: body.avatarUrl,
      bio: body.bio,
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    return res.status(200).json({ profile });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};
