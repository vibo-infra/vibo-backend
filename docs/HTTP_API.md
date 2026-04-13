# HTTP API overview (`/v0/api`)

Base path: **`/v0/api`**. Unless noted, JSON request/response bodies use `Content-Type: application/json`.

---

## Auth (`/v0/api/auth`)

| Method & path | Auth | Practical use |
|----------------|------|----------------|
| `POST /login` | No | App / web tools: email + password → tokens. |
| `POST /register` | No | New account; optional `referralCode` for Spark referral bonus. |
| `POST /logout` | Refresh/body | Invalidate session. |
| `POST /refresh` | Refresh token | Rotate access token. |

---

## Users (`/v0/api/users`)

| Method & path | Auth | Practical use |
|----------------|------|----------------|
| `GET /me` | Bearer | **RN primary “who am I”**: sparks, email, `defaultCity`, notification toggles, `referralCode`, `appPreferences`, `firstName` (from profile join). |
| `PATCH /me` | Bearer | **RN Profile / settings**: city, `firstName`, push/in-app toggles, `appPreferences` (home toggles, theme). Does **not** set avatar/bio/last name. |
| `GET /me/profile` | Bearer | **Rich profile card** (when you add full profile UI): `firstName`, `lastName`, `avatarUrl`, `bio`, timestamps. |
| `PATCH /me/profile` | Bearer | **Avatar / bio / display name** updates on the `profile` table. |

**Separation:** `/me` = account + app behaviour; `/me/profile` = public-style profile fields stored on `profile`.

---

## Events (`/v0/api/events`)

| Method & path | Auth | Practical use |
|----------------|------|----------------|
| `GET /categories` | No | RN Explore / filters. |
| `GET /` | No | Nearby feed — **query:** `lat`, `lng` (and filters per controller). |
| `GET /upcoming` | Bearer | RN Home “your upcoming” (canonical path). |
| `GET /me/upcoming` | Bearer | Same as `/upcoming` (alias). |
| `GET /:id` | No | Event detail sheet. |
| `GET /:id/reviews` | No | Reviews list. |
| `POST /:id/reviews` | Bearer | Submit review. |
| `POST /` | Bearer | Create / host event. |

---

## Sparks (`/v0/api/sparks`)

| Method & path | Auth | Practical use |
|----------------|------|----------------|
| `GET /balance` | Bearer | Current Spark balance (wallet). |
| `GET /transactions` | Bearer | Ledger / history. |

---

## Notifications (`/v0/api/notifications`)

| Method & path | Auth | Practical use |
|----------------|------|----------------|
| `GET /` | Bearer | In-app notification list. |
| `PATCH /:id/read` | Bearer | Mark read. |
| `POST /register-device` | Bearer | FCM device token registration (RN). |
| `POST /unregister-device` | Bearer | Body `{ "token" }` — remove token on logout / push off. |

---

## Config (`/v0/api/config`)

| Method & path | Auth | Practical use |
|----------------|------|----------------|
| `GET /onboarding-cities` | No | RN onboarding city picker (`app_config`). |
| `GET /launch` | No | Live markets, waitlist goal, referral spark amount, etc. |

---

## Web / marketing (`/v0/api/web`)

| Method & path | Auth | Practical use |
|----------------|------|----------------|
| `POST /waitlist` | No | **vibo-web waitlist** form; optional `ref` = waitlist share code (stored on signup, not separate referral HTTP API). |
| `PATCH /waitlist/city` | No | Post-signup city pick (web). |
| `GET /waitlist/count` | No | Waitlist counter on landing. |
| `GET /waitlist/city-count?city=` | No | RN Home waitlist progress by city. |
| `GET /content`, `GET /content/:key` | No | CMS-driven strings (web). |
| `GET /faqs`, `GET /tnc` | No | FAQ + Terms (web). |
| `GET /events/nearby` | No | Public map / marketing nearby events. |
| `POST /email/notify-city`, `POST /email/send-batch` | Internal key | Ops / blast emails only. |
| `POST /jobs/event-reminders` | Internal key | Cron: host push **~24h** and **~1h** before published `event.start_time` (deduped). Schedule every ~10–15 min. |

---

## Analytics (`/v0/api/analytics`)

| Method & path | Auth | Practical use |
|----------------|------|----------------|
| `POST /events` | No | **Product analytics ingest**: batched UI events from **vibo-web** (`lib/analytics.ts` → `sendBeacon`) and **vibo-rn** (`productAnalytics.ts` → `fetch`). Body: `{ session_id, source: "web" \| "app", events: [...] }`. |
| `GET /summary`, `GET /top-elements`, … | Internal key | Ops dashboards / future admin. |

**Module role:** Append-only event sink (`analytics_events` table). `analytics.service.track()` is safe to fire-and-forget from other modules (e.g. web controller after internal actions).

---

## Internal / misc

- **`/health`** — HTML status page (not under `/v0/api`).
