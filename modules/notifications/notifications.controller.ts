import { Request, Response } from 'express';
import * as notificationsService from './notifications.service';

export const listNotifications = async (req: Request, res: Response) => {
  try {
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
    const result = await notificationsService.listMine(req.user.userId, page, limit);
    return res.status(200).json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to list notifications' });
  }
};

export const markRead = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const row = await notificationsService.markAsRead(req.user.userId, id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to update notification' });
  }
};

export const markAllRead = async (req: Request, res: Response) => {
  try {
    const updated = await notificationsService.markAllAsRead(req.user.userId);
    return res.status(200).json({ ok: true, updated });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to mark notifications read' });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const row = await notificationsService.deleteNotification(req.user.userId, id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
};

export const registerDevice = async (req: Request, res: Response) => {
  try {
    const { token, platform } = req.body ?? {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'token is required' });
    }
    const p = String(platform || '').toLowerCase();
    if (!['ios', 'android', 'web'].includes(p)) {
      return res.status(400).json({ error: 'platform must be ios, android, or web' });
    }
    await notificationsService.registerDevice(req.user.userId, token.trim(), p as 'ios' | 'android' | 'web');
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to register device' });
  }
};

export const unregisterDevice = async (req: Request, res: Response) => {
  try {
    const { token } = req.body ?? {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'token is required' });
    }
    await notificationsService.unregisterDevice(req.user.userId, token.trim());
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to unregister device' });
  }
};
