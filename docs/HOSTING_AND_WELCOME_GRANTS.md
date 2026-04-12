# Hosting sparks, waitlist tiers, and welcome grants

This document matches the implementation in `modules/users/authGrants.service.ts`, `modules/hosting/paidHostingCost.ts`, and `modules/events/events.service.ts`.

## Email-level control (today and later)

- **Today:** One app account per email (`users.email` unique). Hosting and grants are keyed by `user_id`; the waitlist is keyed by the same email in `waitlist_signups`.
- **Later:** `users.identity_verified_at` is reserved for government-ID (or equivalent) verification. When `app_config.hosting_requires_identity_verification` is `true`, `assertUserMayHost` rejects hosts without that timestamp.

## One-time grants after register / login (`applyPostAuthGrants`)

Runs idempotently on every auth; each branch is guarded by DB columns so repeats are no-ops.

### Waitlist bundle (exclusive with regular grant)

Applies only if **all** are true:

1. `users.waitlist_spark_bonus_at` is still `NULL`.
2. An email match exists in `waitlist_signups`.
3. **Anti–gaming:** `waitlist_benefits_require_signup_before_account` (default `true`) requires `waitlist_signups.created_at <= users.created_at + 2 minutes` (grace for same-session flows).

Then:

| Tier | Rule | Sparks credited | Extra |
|------|------|-----------------|--------|
| **tier1** | `signup_position <= waitlist_tier1_max_position` (default 100) | `waitlist_tier1_spark_grant_total` (default **1030**) | `waitlist_hosting_discount_until` = now + `waitlist_tier1_discount_months` (default **6** calendar months) |
| **tier2** | Everyone else on the waitlist | `waitlist_tier2_spark_grant_total` (default **530**) | No discounted hosting window |

`users.waitlist_tier` is set to `tier1` or `tier2` for auditing and pricing.

### Regular first-login grant

If the waitlist bundle was **not** applied and `regular_login_spark_grant_at` is `NULL`, credit `regular_first_login_spark_grant` (default **30**) once and set the timestamp.

**Never both:** Waitlist bundle and regular 30 are mutually exclusive in the same lifecycle.

## Paid listing spark cost (non–free events)

Evaluated in order (after account/pre-launch checks and unlimited-hosting promos):

1. **Global / user unlimited hosting** → **0** sparks (existing `hosting.ts` logic).
2. **tier1 discount window** (`waitlist_tier === 'tier1'` and `now < waitlist_hosting_discount_until`) → **`waitlist_tier1_hosting_spark_cost`** (default **20**). Does **not** consume a welcome waiver slot.
3. **Welcome paid waivers** → **0** sparks if `spark_welcome_paid_hostings_used < welcome_free_paid_hostings_count` (default **3**). On successful event creation, `spark_welcome_paid_hostings_used` is incremented in the same transaction (must succeed or the whole create rolls back).
4. **Standard** → **`paid_event_host_spark_cost`** (default **30**).

**Free events** (`is_free`): always **0** sparks.

## `app_config` keys (defaults in migration `20260410106000_hosting_tiers_welcome_grants.sql`)

| Key | Role |
|-----|------|
| `regular_first_login_spark_grant` | One-time sparks if not on waitlist bundle |
| `welcome_free_paid_hostings_count` | Paid listings with spark cost waived |
| `paid_event_host_spark_cost` | Standard paid hosting cost |
| `waitlist_tier1_max_position` | First N by `signup_position` = tier1 |
| `waitlist_tier1_spark_grant_total` | Tier1 lump sum |
| `waitlist_tier2_spark_grant_total` | Tier2 lump sum |
| `waitlist_tier1_hosting_spark_cost` | Paid hosting during tier1 discount window |
| `waitlist_tier1_discount_months` | Length of tier1 discount window |
| `waitlist_benefits_require_signup_before_account` | Anti–gaming: waitlist before account |
| `hosting_requires_identity_verification` | Require `identity_verified_at` to host |

Legacy `waitlist_spark_grant_amount` is **not** read by the new grant code; tier totals replace it.

## API surface for clients

`GET /v0/api/users/me` includes:

- `waitlistTier`: `tier1` \| `tier2` \| `null`
- `waitlistHostingDiscountUntil`: ISO string or `null`
- `sparkWelcomePaidHostingsUsed`: number of welcome waivers already used

Insufficient sparks on create event: **402** with `INSUFFICIENT_SPARKS`, `required`, `available`, and a clear `error` message.

## Edge cases intentionally handled

- **Concurrent event creates:** `FOR UPDATE` on `users` serializes welcome-slot increments and spark debits.
- **Register after waitlist:** Eligible; register before waitlist with `require_signup_before_account` true: **no** waitlist bundle (only regular 30 if applicable).
- **Existing users** who already had `waitlist_spark_bonus_at` from the old single grant: **no** automatic tier backfill; `waitlist_tier` may stay `NULL` until a manual data fix. Pricing then follows welcome slots + standard cost only.

---

## Future extensions — what you need to do

These are **not** fully built yet; the doc below is your checklist when you implement them.

### 1. Government / verified ID before hosting

| Step | What to do |
|------|------------|
| A | Keep using `users.identity_verified_at` (timestamptz, `NULL` = not verified). |
| B | After your ID vendor confirms a user, set `identity_verified_at = NOW()` for that `user_id` (via admin tool or webhook). |
| C | Turn on the gate by setting `app_config` key `hosting_requires_identity_verification` to JSON `true`. |
| D | Optional: add an admin API or internal script that only sets `identity_verified_at` after manual review. |

**Code touchpoint:** `modules/events/hostingEligibility.ts` (`HOSTING_IDENTITY_REQUIRED`).

### 2. Stricter “email + verified ID” as the real identity key

| Step | What to do |
|------|------------|
| A | Decide whether verified ID is **per user** (current model) or **per email** (e.g. block duplicate accounts). |
| B | If per email: add a table such as `email_identity_verification (email, verified_at, …)` or enforce uniqueness rules in signup. |
| C | Update `assertUserMayHost` (or a new pre-check) to read that source of truth, not only `users.identity_verified_at`. |

### 3. “Unlimited free listings, only 1–2 paid listings get welcome waivers”

| Step | What to do |
|------|------------|
| A | Add new `app_config` keys, e.g. `welcome_free_paid_hostings_count` (already exists — tune the number) and/or `unlimited_free_event_hosting` if you want free events never counted. |
| B | Change `modules/hosting/paidHostingCost.ts` so **free** vs **paid** branches match the new product rule (today: free events always cost 0 sparks; welcome waivers apply only to **paid** listings). |
| C | If “only first N **paid**” is different from current “N welcome waivers”, rename or split counters on `users` (e.g. keep `spark_welcome_paid_hostings_used` only for paid). |

### 4. Different waitlist tiers or grant amounts

| Step | What to do |
|------|------------|
| A | Adjust values in `app_config` (tier totals, `waitlist_tier1_max_position`, discount months, discounted spark cost). |
| B | If you add a **third** tier: extend `users.waitlist_tier` check constraint, `authGrants.service.ts` branching, and `paidHostingCost.ts` if pricing differs. |

### 5. Invalidate cached product config after admin edits

| Step | What to do |
|------|------------|
| A | Config is cached ~60s in `getAppConfigSnapshot()`. After admin updates `app_config`, either wait one minute or call `invalidateAppConfigCache()` from an admin endpoint (export exists in `appConfig.service.ts`). |

### 6. Admin UI (recommended long term)

Build internal screens or scripts that wrap the **manual SQL patterns** in the next section, with audit logs (who changed what, when).

---

## Admin: manual Sparks management

The app keeps **`spark_wallet.balance`** and **`users.spark_balance`** in sync when debits/credits go through the app. Manual edits should update **both** and ideally append an audit row.

### Tables and fields

| Table | Column | Purpose |
|-------|--------|---------|
| `spark_wallet` | `user_id` (PK) | One row per user. |
| `spark_wallet` | `balance` | Current Sparks (bigint, ≥ 0). **Source of truth** for balance reads used with wallet. |
| `spark_wallet` | `updated_at` | Last mutation. |
| `users` | `spark_balance` | Legacy mirror; **should match** `spark_wallet.balance` after fixes. |
| `spark_transaction` | `transaction_id` | UUID PK. |
| `spark_transaction` | `user_id` | Who the row belongs to. |
| `spark_transaction` | `amount` | Signed delta: **positive = credit**, **negative = debit**. |
| `spark_transaction` | `balance_after` | Balance immediately after this row (≥ 0). |
| `spark_transaction` | `reason` | e.g. `admin_adjustment`, `waitlist_tier_grant`, `paid_event_hosting`. |
| `spark_transaction` | `reference_type`, `reference_id` | Optional link (e.g. ticket id). |
| `spark_transaction` | `metadata` | JSONB for notes (`{"note":"support case 123"}`). |
| `spark_transaction` | `created_at` | When it happened. |

### Safe manual pattern (single user)

Do in **one transaction**:

1. `SELECT balance FROM spark_wallet WHERE user_id = $uid FOR UPDATE` (or insert wallet row first if missing — see app `INSERT_SPARK_WALLET` logic).
2. Compute `new_balance = old_balance + delta` (must be ≥ 0).
3. `UPDATE spark_wallet SET balance = new_balance, updated_at = NOW() WHERE user_id = $uid`
4. `UPDATE users SET spark_balance = new_balance, updated_at = NOW() WHERE user_id = $uid`
5. `INSERT INTO spark_transaction (user_id, amount, balance_after, reason, reference_type, reference_id, metadata) VALUES (...)` with `amount = delta`, `balance_after = new_balance`, `reason = 'admin_adjustment'`.

**Never** only change `users.spark_balance` without `spark_wallet` — the API reads `COALESCE(spark_wallet.balance, users.spark_balance)` and the next in-app debit will be wrong.

### Grant / revoke without re-running auto-grants

Auto grants use flags on `users`:

| Column | Meaning |
|--------|---------|
| `waitlist_spark_bonus_at` | Waitlist bundle already claimed; app will **not** run waitlist grant again while set. |
| `regular_login_spark_grant_at` | Regular 30 (or configured amount) already claimed. |

To **force** a one-time script to “re-grant”, you’d have to clear the relevant flag **and** understand double-credit risk — usually prefer **manual `spark_transaction` + wallet update** instead.

---

## Admin: manual waitlist management

### Tables and fields

| Table | Column | Purpose |
|-------|--------|---------|
| `waitlist_signups` | `id` | UUID PK. |
| `waitlist_signups` | `email` | Unique; matched to `users.email` for grants. |
| `waitlist_signups` | `signup_position` | Integer join order (1 = first). Drives **tier1 vs tier2** (`<= waitlist_tier1_max_position`). |
| `waitlist_signups` | `created_at` | Used for “waitlist before account” eligibility vs `users.created_at`. |
| `waitlist_signups` | `city`, `role`, `source`, UTM fields | Marketing / ops. |
| `waitlist_signups` | `converted`, `app_user_id` | Conversion tracking (if you use them). |

### Common ops

| Goal | What to do |
|------|------------|
| **Add someone** | `INSERT` into `waitlist_signups` (trigger sets `signup_position` on insert in normal app flow — if you insert via SQL, check whether your DB trigger still runs or set position consistently with product rules). |
| **Fix email typo** | `UPDATE waitlist_signups SET email = ...` — ensure it still matches the user’s `users.email` if they should receive tier benefits. |
| **Remove from waitlist** | `DELETE` or mark inactive **only** if product allows; deleting breaks historical `signup_position` sequence semantics for reporting. Prefer soft-flag if you add one later. |
| **Make user eligible for tier bundle after mistake** | Ensure `waitlist_spark_bonus_at` is `NULL`, row exists in `waitlist_signups` for that email, and timing rule passes — **or** run manual Sparks + set `users.waitlist_tier`, `waitlist_hosting_discount_until` by hand (see below). |

### Manual tier / discount without re-running grant code

On `users` for a given `user_id`:

| Column | When to set |
|--------|-------------|
| `waitlist_tier` | `'tier1'` or `'tier2'` for pricing rules in `paidHostingCost.ts`. |
| `waitlist_hosting_discount_until` | End of discounted **paid** hosting window for tier1 (timestamptz). |
| `waitlist_spark_bonus_at` | Set to `NOW()` if you want the app to treat the bundle as **already applied** so login won’t try again. |
| `spark_welcome_paid_hostings_used` | Reset or set if you need to **give or remove** welcome paid waivers (0..`welcome_free_paid_hostings_count`). |

Always pair manual Sparks changes with `spark_wallet` / `spark_transaction` as above.

---

## Quick reference: `users` columns touched by this system

| Column | Role |
|--------|------|
| `email` | Waitlist match key. |
| `created_at` | vs `waitlist_signups.created_at` for anti-gaming. |
| `spark_balance` | Mirror of wallet balance. |
| `waitlist_spark_bonus_at` | Waitlist bundle claimed. |
| `regular_login_spark_grant_at` | Regular first-login sparks claimed. |
| `waitlist_tier` | `tier1` / `tier2` / `NULL`. |
| `waitlist_hosting_discount_until` | tier1 discounted paid hosting cutoff. |
| `spark_welcome_paid_hostings_used` | Welcome paid waivers consumed. |
| `identity_verified_at` | Future ID gate. |
| `is_verified` | Email/account verification (MVP hosting gate via `hosting_requires_verification_mvp`). |
| `unlimited_hosting_until` | Per-user unlimited hosting promo window. |

---

## `app_config` — admin updates

Table: **`app_config`**

| Column | Role |
|--------|------|
| `config_key` | Text PK (see keys listed earlier in this doc). |
| `value` | JSONB (numbers as JSON numbers, booleans as JSON booleans, dates as JSON strings ISO-8601). |
| `updated_at` | Last change. |

Example (set standard paid cost to 35):

```sql
UPDATE app_config
SET value = '35'::jsonb, updated_at = NOW()
WHERE config_key = 'paid_event_host_spark_cost';
```

After bulk edits, rely on cache TTL or restart workers / call `invalidateAppConfigCache()` if wired.

---

## Troubleshooting: `sparkBalance` shows 0 but you can still create events

**Why events still work**

- **Free listings** (`is_free` / default in many clients) cost **0** Sparks — no balance required.
- **Paid listings** can still cost **0** for your first **welcome waivers** (see `welcome_free_paid_hostings_count`); balance can stay 0 until those are used up.

**Why balance looked 0 while Sparks existed**

- The API used `COALESCE(spark_wallet.balance, users.spark_balance)`. If a `spark_wallet` row existed with balance **0** but `users.spark_balance` still had a grant from older flows, SQL treated `0` as a real wallet value and **never** fell back to `users`.
- The backend now runs **`reconcileSparkMirrorForUser`** before `/me`, balance endpoint, hosting lock, and grant transactions: it merges legacy balances when there is **no** `spark_transaction` row yet, then mirrors wallet → `users.spark_balance`.

**If balance is still 0 after deploy**

1. Call **`POST /v0/api/auth/login`** or **refresh** once so `applyPostAuthGrants` runs (credits the regular **30** if you are not on the waitlist bundle and `regular_login_spark_grant_at` is still null).
2. In SQL, check `users.regular_login_spark_grant_at`, `users.waitlist_spark_bonus_at`, `spark_wallet.balance`, `users.spark_balance`, and `spark_transaction` for your `user_id`.
3. If `regular_login_spark_grant_at` is set but both balances are 0, see the manual Sparks section above — something claimed the grant without crediting the wallet.
