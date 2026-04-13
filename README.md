# VIBO backend

Node/Express API with PostgreSQL. Entry: `main.ts`.

**Route map & consumer notes:** [docs/HTTP_API.md](./docs/HTTP_API.md).

## Database migrations

Set `POSTGRES_SUPABASE_DB_URL` (or your Postgres URL) in `.env`, then:

```bash
npx ts-node core/database/migrate.ts
```

Migrations live in `core/database/migrations/` and run in filename order.

---

## Referrals and Sparks (mobile app)

### How it works

1. Each **registered user** has a unique **`referral_code`** on the `users` row (short alphanumeric string). They can share it from the app (e.g. “Invite friends”).
2. When someone **creates an account** via `POST /v0/api/auth/register`, they may pass an optional **`referralCode`** matching another user’s code (case-insensitive).
3. The new user is stored with **`referred_by_user_id`** pointing at that referrer.
4. **Once per invitee**, the server records a row in **`referral_bonus_granted`** and credits the **referrer +N Sparks** (via the Sparks wallet; **N** = `app_config.referral_invite_sparks`, default **20**). Duplicate grants are prevented by the table’s primary key on `invitee_user_id`.

This is independent of the **web waitlist** share link (see below).

### API

- **Register with a code:** `POST /v0/api/auth/register` body includes `referralCode` (optional) plus required `email`, `password`, `defaultCity`.
- **Who referred me / my code:** Returned on `GET /v0/api/users/me` as `referralCode` and internal `referred_by_user_id` is not exposed in the public payload (only the code you can share). Full display profile (avatar, bio, last name) lives under **`GET /v0/api/users/me/profile`** (see [docs/HTTP_API.md](./docs/HTTP_API.md)).

### Implementation files

- `modules/auth/auth.service.ts` — resolves `referralCode` → `referred_by_user_id`, calls `tryGrantReferralBonus` after signup.
- `modules/auth/referralBonus.service.ts` — idempotent referral Sparks for referrer (amount from `launchMarkets` / `app_config.referral_invite_sparks`).
- `modules/auth/referralCode.util.ts` — assigns `referral_code` for new users.
- `core/database/migrations/20260410107000_referral_app_prefs.sql` and **`20260410110000_...`** — columns + `referral_bonus_granted`; the `10110000` migration also aligns web waitlist storage and drops legacy `referral_codes`.

---

## Web waitlist “referral” link (separate from app Sparks)

The marketing site waitlist stores each signup’s personal link code in **`waitlist_signups.referral_share_code`** (not a separate table). Another person can join the waitlist with `ref` set to that code; `ref_code_used` / `referred_by` track attribution for waitlist analytics and optional milestone emails. This does **not** grant Sparks by itself—**Sparks referrals are only via app registration** with `referralCode` as above.

Legacy table **`referral_codes`** is removed by migration `20260410110000_*`.
