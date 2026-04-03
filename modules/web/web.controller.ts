import { Request, Response } from 'express';
import * as webService from './web.service';

// ── Waitlist ──────────────────────────────────────────────────────────────────

export const joinWaitlist = async (req: Request, res: Response) => {
  try {
    const { email, role, city, source, utm_source, utm_medium, utm_campaign, ref } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'email is required' });
    }
    const result = await webService.joinWaitlist({
      email, role, city, source, utm_source, utm_medium, utm_campaign, ref,
    });
    return res.status(result.already_registered ? 200 : 201).json({ success: true, data: result });
  } catch (err: any) {
    console.error('[web] joinWaitlist error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

export const updateWaitlistCity = async (req: Request, res: Response) => {
  try {
    const { email, city } = req.body ?? {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'email is required' });
    }
    if (city == null || typeof city !== 'string' || !city.trim()) {
      return res.status(400).json({ error: 'city is required' });
    }
    const data = await webService.updateWaitlistCity({ email, city });
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    if (err.message === 'WAITLIST_CITY_EMAIL_REQUIRED' || err.message === 'WAITLIST_CITY_VALUE_REQUIRED') {
      return res.status(400).json({ error: 'email and city are required' });
    }
    if (err.message === 'WAITLIST_CITY_INVALID') {
      return res.status(400).json({ error: 'invalid city' });
    }
    if (err.message === 'WAITLIST_SIGNUP_NOT_FOUND') {
      return res.status(404).json({ error: 'waitlist signup not found' });
    }
    console.error('[web] updateWaitlistCity error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

export const getWaitlistCount = async (_req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'public, max-age=60');
    const data = await webService.getWaitlistCount();
    return res.status(200).json({ success: true, data });
  } catch {
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

export const convertSignup = async (req: Request, res: Response) => {
  try {
    const { email, user_id } = req.body;
    if (!email || !user_id) {
      return res.status(400).json({ error: 'email and user_id are required' });
    }
    const result = await webService.convertSignup({ email, user_id });
    return res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    if (err.message === 'WAITLIST_SIGNUP_NOT_FOUND') {
      return res.status(404).json({ error: 'Signup not found for this email' });
    }
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

// ── Referral ───────────────────────────────────────────────────────────────  ───

export const getReferralCode = async (req: Request, res: Response) => {
  try {
    const result = await webService.getReferralCode(req.params.code as string);
    if (!result) return res.status(404).json({ success: false, message: 'Invalid referral code' });
    return res.status(200).json({ success: true, data: result });
  } catch {
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

export const referralClick = async (req: Request, res: Response) => {
  // Respond immediately — update happens after
  res.status(200).json({ success: true });
  const code = req.body.code;
  if (code && typeof code === 'string') {
    webService.recordReferralClick(code).catch(() => {});
  }
};

// ── Content ───────────────────────────────────────────────────────────────────

export const getContent = async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'public, max-age=60');
    const { section } = req.query as { section?: string };
    const data = await webService.getContent(section);
    return res.status(200).json({ success: true, data });
  } catch {
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

export const getContentByKey = async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'public, max-age=60');
    const data = await webService.getContentByKey(req.params.key as string);
    if (!data) return res.status(404).json({ error: 'Key not found' });
    return res.status(200).json({ success: true, data });
  } catch {
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

// ── FAQs ──────────────────────────────────────────────────────────────────────

export const getFaqs = async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');
    const { category } = req.query as { category?: string };
    const data = await webService.getFaqs(category);
    return res.status(200).json({ success: true, data });
  } catch {
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

// ── T&C ───────────────────────────────────────────────────────────────────────

export const getTnc = async (_req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');
    const data = await webService.getTnc();
    return res.status(200).json({ success: true, data });
  } catch {
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

// ── Help ──────────────────────────────────────────────────────────────────────

export const getHelpArticles = async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');
    const { category } = req.query as { category?: string };
    const data = await webService.getHelpArticles(category);
    return res.status(200).json({ success: true, data });
  } catch {
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

export const getHelpArticle = async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');
    const data = await webService.getHelpArticle(req.params.slug as string);
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    if (err.message === 'HELP_ARTICLE_NOT_FOUND') {
      return res.status(404).json({ error: 'Article not found' });
    }
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

// ── Events nearby ─────────────────────────────────────────────────────────────

export const getNearbyEvents = async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');
    const { city = 'Mumbai', limit = '6', category } = req.query as Record<string, string>;
    const data = await webService.getNearbyEvents(city, parseInt(limit, 10), category);
    return res.status(200).json({ success: true, data });
  } catch {
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

// ── City launch ───────────────────────────────────────────────────────────────

export const notifyCity = async (req: Request, res: Response) => {
  try {
    const { city, message, dry_run } = req.body;
    if (!city || typeof city !== 'string') {
      return res.status(400).json({ error: 'city is required' });
    }
    const result = await webService.notifyCity({ city, message, dry_run });
    return res.status(200).json({ success: true, data: result });
  } catch {
    return res.status(500).json({ error: 'Something went wrong' });
  }
};