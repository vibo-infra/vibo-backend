import { Router } from 'express';
import { internalOnly } from '../../core/middleware/internalOnly';
import * as webController from './web.controller';

const router = Router();

// ── Waitlist ──────────────────────────────────────────────────────────────────
router.post(  '/waitlist',          webController.joinWaitlist);
router.get(   '/waitlist/count',    webController.getWaitlistCount);
router.patch( '/waitlist/city',     webController.updateWaitlistCity);
router.patch( '/waitlist/convert',  internalOnly, webController.convertSignup);

// ── Referral ──────────────────────────────────────────────────────────────────
router.get(  '/referral/:code',     webController.getReferralCode);
router.post( '/referral/click',     webController.referralClick);

// ── Dynamic content ───────────────────────────────────────────────────────────
router.get(  '/content',            webController.getContent);
router.get(  '/content/:key',       webController.getContentByKey);

// ── FAQs ──────────────────────────────────────────────────────────────────────
router.get(  '/faqs',               webController.getFaqs);

// ── T&C ───────────────────────────────────────────────────────────────────────
router.get(  '/tnc',                webController.getTnc);

// ── Help ──────────────────────────────────────────────────────────────────────
router.get(  '/help',               webController.getHelpArticles);
router.get(  '/help/:slug',         webController.getHelpArticle);

// ── Events nearby ─────────────────────────────────────────────────────────────
router.get(  '/events/nearby',      webController.getNearbyEvents);

// ── City launch email (internal) ──────────────────────────────────────────────
router.post( '/email/notify-city',  internalOnly, webController.notifyCity);

export default router;