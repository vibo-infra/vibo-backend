# Vibo Backend — Developer Handbook
### From schema design to production. Every dev follows this, every time.

---

## Why this document exists

When multiple developers work on the same backend, things break in predictable ways — someone manually edits a table in their local database and forgets to tell others, someone writes a query against a column that doesn't exist on another machine, someone deploys and production breaks because the schema wasn't updated.

This guide exists to eliminate all of that. Every step here is intentional. Follow it and your database will always be in sync across every machine — local, staging, and production.

---

## The mental model before anything else

Think of your project in three separate layers:

```
┌─────────────────────────────────────────┐
│           APPLICATION LAYER             │
│   TypeScript code, routes, services,    │
│   repositories, queries (.queries.ts)   │
└─────────────────┬───────────────────────┘
                  │ reads/writes via pg pool
┌─────────────────▼───────────────────────┐
│            MIGRATION LAYER              │
│   SQL files that define the schema.     │
│   Version controlled. Append-only.      │
│   Run once per machine, never again.    │
└─────────────────┬───────────────────────┘
                  │ creates tables/columns/indexes
┌─────────────────▼───────────────────────┐
│            DATABASE LAYER               │
│   Postgres. Stores the actual data.     │
│   Never touched directly by devs        │
│   except through migrations.            │
└─────────────────────────────────────────┘
```

Your `.queries.ts` files talk to the database at runtime.
Your migration files talk to the database at setup time.
These two must never be confused.

---

## Part 1 — Designing your schema (before writing any code)

This is the most important step. Get it wrong here and you'll write many painful migrations later.

### Step 1.1 — Identify your entities

Write down every "thing" your app manages. For Vibo:

```
users        — people who use the app
events       — things that happen
venues       — places where events happen
tickets      — a user's registration for an event
notifications — messages sent to a user
```

Each entity becomes a table.

### Step 1.2 — Identify relationships

For every pair of entities, ask: how do they relate?

| Relationship | Type | How to implement |
|---|---|---|
| A user creates many events | one-to-many | `events.user_id → users.id` |
| An event happens at one venue | many-to-one | `events.venue_id → venues.id` |
| A user registers for many events, an event has many users | many-to-many | join table: `tickets(user_id, event_id)` |
| A user has many notifications | one-to-many | `notifications.user_id → users.id` |

### Step 1.3 — Draw it out (ERD)

Before writing a single SQL file, sketch your Entity Relationship Diagram. It doesn't need to be fancy — even on paper.

```
users
  id (PK)
  email
  password_hash
  role
  created_at
  updated_at
    │
    │ 1:many
    ▼
events
  id (PK)
  user_id (FK → users.id)      ← who created it
  venue_id (FK → venues.id)    ← where it is
  title
  starts_at
  ends_at
  created_at
    │
    │ many:many via tickets
    ▼
tickets
  id (PK)
  user_id (FK → users.id)      ← who registered
  event_id (FK → events.id)    ← for what event
  created_at
```

### Step 1.4 — Column design rules

Follow these for every table you design:

**Always include:**
```sql
id         UUID        PRIMARY KEY DEFAULT gen_random_uuid()
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()  -- on tables that get edited
```

**Why UUID over SERIAL (auto-increment)?**
- `SERIAL` gives you `1`, `2`, `3` — users can guess other users' IDs from the URL
- UUID gives you `a3f8c1d2-...` — unguessable, safe in public URLs
- UUIDs work across distributed systems without coordination
- You can generate a UUID in your app before inserting — useful for optimistic UI

**Why TIMESTAMPTZ over TIMESTAMP?**
- `TIMESTAMP` stores no timezone — ambiguous and dangerous across regions
- `TIMESTAMPTZ` stores UTC, converts to local time on read — always correct

**Naming conventions:**
- Tables: plural, snake_case (`users`, `events`, `venue_bookings`)
- Columns: snake_case (`user_id`, `starts_at`, `is_published`)
- Foreign keys: `{referenced_table_singular}_id` (`user_id`, `venue_id`)
- Boolean columns: prefix with `is_` or `has_` (`is_read`, `has_verified_email`)
- Timestamp columns: suffix with `_at` (`created_at`, `deleted_at`, `published_at`)

---

## Part 2 — Setting up the project (first time only)

### Step 2.1 — Install dependencies

```bash
npm install pg
npm install -D @types/pg tsx dotenv
```

### Step 2.2 — Environment files

`.env.dev` — your local credentials, never committed:
```env
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/vibo_dev
NODE_ENV=development
```

`.env.dev.example` — committed to Git, no real values:
```env
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/vibo_dev
NODE_ENV=development
```

**Why keep an example file?**
When a new dev clones the repo, they immediately know what environment variables they need to fill in. Without this, they have to ask someone or dig through the code.

### Step 2.3 — Create the database

```bash
createdb vibo_dev
```

### Step 2.4 — The pg pool (`core/database/client.ts`)

```ts
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

This is the single connection pool shared across your entire app. Import `pool` from here wherever you need to query the database. Never create a new `Pool` or `Client` in individual files.

---

## Part 3 — The migration system

### Why migrations exist

Without migrations, sharing database changes looks like this:
- "Hey, I added a `bio` column to users — run this in your psql"
- Someone misses the Slack message
- Their app crashes with `column bio does not exist`
- You spend 20 minutes debugging

With migrations, sharing database changes looks like this:
- Push a SQL file to Git
- Teammates run `npm run migrate`
- Done. Everyone's schema matches.

Migrations are version control for your database schema. Just as Git tracks code changes, migrations track schema changes.

### Step 3.1 — The migration runner (`core/database/migrate.ts`)

```ts
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigrations() {
  const client = await pool.connect();

  try {
    // On first run, create a table that tracks applied migrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id          SERIAL      PRIMARY KEY,
        filename    TEXT        NOT NULL UNIQUE,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // timestamps sort chronologically as strings

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT 1 FROM _migrations WHERE filename = $1',
        [file]
      );

      if (rows.length > 0) {
        console.log(`⏭  Already applied: ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`✅ Applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed on: ${file}`);
        console.error(err);
        process.exit(1);
      }
    }

    console.log('\n🎉 All migrations complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
```

**Why wrap each migration in a transaction?**
If a migration file has 5 SQL statements and the 4th one fails, the first 3 have already run. Without a transaction you'd be left with a half-applied schema — tables that exist but are missing columns, indexes pointing at nothing. The transaction ensures all-or-nothing: either the entire file applies cleanly, or none of it does and you get a clear error.

### Step 3.2 — The migration generator (`scripts/createMigration.ts`)

```ts
import fs from 'fs';
import path from 'path';

const name = process.argv[2];

if (!name) {
  console.error('Usage: npm run migration:create <name>');
  console.error('Example: npm run migration:create add_bio_to_users');
  process.exit(1);
}

// Produces: "20250322143012"
const timestamp = new Date()
  .toISOString()
  .replace(/[-T:.Z]/g, '')
  .slice(0, 14);

const filename = `${timestamp}_${name}.sql`;
const migrationsDir = path.join(__dirname, '../core/database/migrations');

if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

fs.writeFileSync(
  path.join(migrationsDir, filename),
  `-- Migration: ${name}\n-- Created at: ${new Date().toISOString()}\n\n`
);

console.log(`✅ Created: core/database/migrations/${filename}`);
```

**Why timestamps instead of `001_`, `002_`?**
Sequence numbers cause conflicts when two devs create migrations simultaneously on different branches — both write `005_something.sql`. Timestamps are generated at the exact second you run the command. Two devs working at the same time produce `20250322143012_...` and `20250322151834_...` — different filenames, no conflict, sort correctly.

### Step 3.3 — `package.json` scripts

```json
{
  "scripts": {
    "migrate": "dotenv -e .env.dev -- tsx core/database/migrate.ts",
    "migrate:prod": "dotenv -e .env.production -- tsx core/database/migrate.ts",
    "migration:create": "tsx scripts/createMigration.ts",
    "seed": "dotenv -e .env.dev -- tsx scripts/seed.ts"
  }
}
```

---

## Part 4 — Seeds (local dev only)

### What seeds are

Seeds are SQL files that insert fake but realistic data into your local database. They exist purely for developer comfort.

When you run migrations on a fresh database, the schema is correct but the tables are empty. You can't test "list all events for a user" if there are no users or events. Instead of inserting rows manually through your pg GUI every time, seeds do it in one command.

**Seeds never run in production.** Real users create real data in production.

### When to use seeds vs not

| Situation | Use seeds? |
|---|---|
| Testing an endpoint locally | ✅ Yes |
| Demoing a feature to a teammate | ✅ Yes |
| Inserting initial data on production (e.g. role types) | ❌ No — use a migration instead |
| Populating production with test data | ❌ Never |

**If data must exist in production from day one** (like a `roles` table with fixed values), put it in a migration file — not a seed. Seeds are skippable. Migrations are not.

### The seed runner (`scripts/seed.ts`)

```ts
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

if (process.env.NODE_ENV === 'production') {
  console.error('❌ Seeds cannot run in production!');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runSeeds() {
  const seedsDir = path.join(__dirname, '../core/database/seeds');
  const files = fs
    .readdirSync(seedsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(seedsDir, file), 'utf-8');
    await pool.query(sql);
    console.log(`🌱 Seeded: ${file}`);
  }

  await pool.end();
  console.log('\n✅ Seeding complete.');
}

runSeeds();
```

### Example seed file (`core/database/seeds/001_seed_dev_users.sql`)

```sql
INSERT INTO users (email, password_hash, role) VALUES
  ('admin@vibo.dev',  '$2b$10$placeholder', 'admin'),
  ('user@vibo.dev',   '$2b$10$placeholder', 'member')
ON CONFLICT (email) DO NOTHING;
```

`ON CONFLICT DO NOTHING` makes seeds idempotent — running them twice doesn't duplicate data.

---

## Part 5 — Creating your actual tables (the full flow)

This is the complete flow every time you need a new table or a schema change.

### Flow for a brand new table

```
Design the schema on paper / ERD
        ↓
npm run migration:create create_venues_table
        ↓
Write the SQL in the generated file
        ↓
npm run migrate  (apply it locally)
        ↓
Verify in pg GUI (TablePlus / DBeaver)
        ↓
Write your .queries.ts, .repository.ts, .service.ts, etc.
        ↓
Test endpoints locally
        ↓
git add . && git commit && git push
        ↓
Other devs: git pull && npm run migrate
```

### Example: creating a venues table end to end

**1. Generate the migration**
```bash
npm run migration:create create_venues_table
# → core/database/migrations/20250322160000_create_venues_table.sql
```

**2. Write the SQL**
```sql
-- Migration: create_venues_table
-- Created at: 2025-03-22T16:00:00.000Z

CREATE TABLE venues (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  address    TEXT        NOT NULL,
  city       TEXT        NOT NULL,
  capacity   INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**3. Apply it locally**
```bash
npm run migrate
# ✅ Applied: 20250322160000_create_venues_table.sql
```

**4. Verify in your pg GUI**
Open TablePlus / DBeaver, connect to `vibo_dev`, confirm `venues` table exists with the right columns.

**5. Add `venue_id` to events (this is a separate migration)**
```bash
npm run migration:create add_venue_id_to_events
```

```sql
ALTER TABLE events
  ADD COLUMN venue_id UUID REFERENCES venues(id) ON DELETE SET NULL;
```

**Why a separate migration?**
`venues` must exist before `events` can reference it. Two separate files in the right order guarantees this. Never put dependent changes in the same file — if the second statement fails, the whole file rolls back and you lose both.

**6. Apply again**
```bash
npm run migrate
# ⏭  Already applied: 20250322160000_create_venues_table.sql
# ✅ Applied: 20250322160142_add_venue_id_to_events.sql
```

**7. Write the application code**

```ts
// modules/venues/venues.queries.ts
export const CREATE_VENUE = `
  INSERT INTO venues (name, address, city, capacity)
  VALUES ($1, $2, $3, $4)
  RETURNING *
`;

export const GET_VENUE_BY_ID = `
  SELECT * FROM venues WHERE id = $1
`;

export const GET_ALL_VENUES = `
  SELECT * FROM venues ORDER BY created_at DESC
`;
```

```ts
// modules/venues/venues.repository.ts
import { pool } from '../../core/database/client';
import { CREATE_VENUE, GET_VENUE_BY_ID, GET_ALL_VENUES } from './venues.queries';

export const createVenue = async (data: {
  name: string;
  address: string;
  city: string;
  capacity?: number;
}) => {
  const { rows } = await pool.query(CREATE_VENUE, [
    data.name,
    data.address,
    data.city,
    data.capacity ?? null,
  ]);
  return rows[0];
};

export const getVenueById = async (id: string) => {
  const { rows } = await pool.query(GET_VENUE_BY_ID, [id]);
  return rows[0] ?? null;
};
```

**8. Commit everything together**
```bash
git add .
git commit -m "feat: add venues module with DB migrations"
git push origin feature/add-venues
```

The migration files and the TypeScript code ship in the same commit. A reviewer can read both together and understand the full change.

---

## Part 6 — Relationship tables (many-to-many)

A user can attend many events. An event can have many attendees. This is a many-to-many relationship — it needs a join table.

### When do you need a join table?

If you find yourself saying "a [thing] can have many [other things], and a [other thing] can have many [things]" — that's a many-to-many, you need a join table.

Examples: users ↔ events, users ↔ roles, events ↔ tags

### Creating the join table

```bash
npm run migration:create create_tickets_table
```

```sql
-- Migration: create_tickets_table
-- Created at: 2025-03-22T17:00:00.000Z

CREATE TABLE tickets (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  event_id   UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent a user from registering for the same event twice
  UNIQUE(user_id, event_id)
);

-- Index for fast lookup of "all events for a user"
CREATE INDEX idx_tickets_user_id  ON tickets(user_id);

-- Index for fast lookup of "all attendees for an event"
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
```

**Why `ON DELETE CASCADE`?**
If a user is deleted, their tickets should be deleted too — there's no point keeping a ticket that belongs to nobody. Same for events. `CASCADE` handles this automatically. Without it, trying to delete a user who has tickets throws a foreign key violation error.

**Why the UNIQUE constraint?**
Without it, a user could accidentally register for the same event 10 times. The database enforces this rule at the lowest possible level — even if your app code has a bug, the database won't allow duplicates.

**Why indexes on both foreign keys?**
Without an index, "get all events for user X" scans every row in the tickets table. With an index on `user_id`, it goes directly to the right rows. Always add indexes on foreign key columns in join tables.

### Querying a many-to-many relationship

```ts
// modules/events/events.queries.ts

// Get all events a user is attending
export const GET_EVENTS_FOR_USER = `
  SELECT e.*
  FROM events e
  JOIN tickets t ON t.event_id = e.id
  WHERE t.user_id = $1
  ORDER BY e.starts_at ASC
`;

// Get all attendees for an event
export const GET_ATTENDEES_FOR_EVENT = `
  SELECT u.id, u.email
  FROM users u
  JOIN tickets t ON t.user_id = u.id
  WHERE t.event_id = $1
`;

// Register a user for an event
export const CREATE_TICKET = `
  INSERT INTO tickets (user_id, event_id)
  VALUES ($1, $2)
  ON CONFLICT (user_id, event_id) DO NOTHING
  RETURNING *
`;
```

---

## Part 7 — The complete reference for ongoing changes

### How to add a column

```bash
npm run migration:create add_bio_to_users
```
```sql
ALTER TABLE users ADD COLUMN bio TEXT;
```

### How to add a NOT NULL column safely

Never add a `NOT NULL` column to an existing table in one step — existing rows have no value for it and the migration will fail.

Do it in two migrations:

```bash
npm run migration:create add_published_at_to_events
```
```sql
-- Step 1: add as nullable
ALTER TABLE events ADD COLUMN published_at TIMESTAMPTZ;
```

```bash
npm run migration:create make_published_at_not_null
```
```sql
-- Step 2: backfill, then add constraint
UPDATE events SET published_at = created_at WHERE published_at IS NULL;
ALTER TABLE events ALTER COLUMN published_at SET NOT NULL;
```

### How to add an index

```bash
npm run migration:create add_events_starts_at_index
```
```sql
CREATE INDEX idx_events_starts_at ON events(starts_at);
```

### How to drop a column

```bash
npm run migration:create drop_legacy_token_from_users
```
```sql
ALTER TABLE users DROP COLUMN IF EXISTS legacy_token;
```

### How to rename a column

```bash
npm run migration:create rename_starts_at_to_start_time
```
```sql
ALTER TABLE events RENAME COLUMN starts_at TO start_time;
```

### How to add required data to production (not a seed)

If some data must exist before your app can run — like default roles, config values, or lookup table entries — put it in a migration:

```bash
npm run migration:create seed_default_roles
```
```sql
INSERT INTO roles (name) VALUES
  ('admin'),
  ('member'),
  ('guest')
ON CONFLICT (name) DO NOTHING;
```

This runs as part of `npm run migrate` on every machine including production. This is the right place for required baseline data.

---

## Part 8 — Git workflow

### What is committed vs ignored

| File | Committed | Reason |
|---|---|---|
| `core/database/migrations/*.sql` | ✅ | Schema history — this is the whole point |
| `core/database/seeds/*.sql` | ✅ | Dev data, safe to share |
| `core/database/migrate.ts` | ✅ | The runner script |
| `scripts/createMigration.ts` | ✅ | The generator |
| `.env.dev.example` | ✅ | Tells teammates what vars they need |
| `.env.dev` | ❌ | Real credentials |
| `.env.production` | ❌ | Real credentials |

### Feature branch flow

```bash
# 1. Always start from updated main
git checkout main
git pull origin main

# 2. Create a feature branch
git checkout -b feature/add-venues

# 3. Do your work — create migrations, write code
npm run migration:create create_venues_table
# ... write SQL, write TypeScript ...
npm run migrate   # test it locally

# 4. Commit migration + code together
git add .
git commit -m "feat: add venues module with create_venues_table migration"
git push origin feature/add-venues

# 5. Open PR → review → merge
```

### After every pull — always run migrate

```bash
git pull origin main
npm run migrate
```

Make this automatic. New migration files are just SQL text files — Git merges them perfectly. The `_migrations` table ensures only new ones run.

### When a teammate merges a migration while you're working

No action needed during your feature work. When you eventually pull and merge main into your branch:

```bash
git merge main
npm run migrate
# Their migration applies to your local DB automatically
# You continue working with the updated schema
```

---

## Part 9 — New developer setup (share this exactly)

```bash
# 1. Clone the repo
git clone https://github.com/your-org/vibo-backend.git
cd vibo-backend

# 2. Install dependencies
npm install

# 3. Create local environment file
cp .env.dev.example .env.dev
# Open .env.dev and fill in your local postgres credentials

# 4. Create a local database
createdb vibo_dev

# 5. Apply all migrations — this builds your entire schema from scratch
npm run migrate

# 6. Seed local dev data so you have something to work with
npm run seed

# 7. Start the dev server
npm run dev
```

That's it. No asking teammates for a database dump. No manual table creation. The migration files in Git contain the full history of the schema.

---

## Part 10 — Rules every developer must follow

### Migration rules

1. **Never edit an existing migration file.**
   It has already been applied on other machines. The `_migrations` table marks it as done — your edit will never run for anyone. Create a new migration instead.

2. **Never create migration files manually.**
   Always use `npm run migration:create <name>`. Timestamps prevent filename conflicts between devs.

3. **One concern per migration file.**
   Creating a table and adding an index on another table are two concerns — two files. Small focused migrations are easier to review, easier to roll back mentally, and easier to understand months later.

4. **Migrations that depend on each other go in separate files.**
   `events` needs `venues` to exist first? Create `venues` in one file, add the foreign key to `events` in the next. The timestamp order guarantees the right sequence.

5. **Required production data goes in a migration, not a seed.**
   Seeds are optional and dev-only. If the app won't work without certain rows, that's a migration.

### Code rules

6. **Never write raw SQL in controllers or services.**
   All SQL lives in `.queries.ts` files. Controllers call services, services call repositories, repositories call queries.

7. **Always use parameterized queries.**
   Never concatenate user input into SQL strings.
   ```ts
   // ❌ SQL injection risk
   pool.query(`SELECT * FROM users WHERE email = '${email}'`);

   // ✅ Safe
   pool.query('SELECT * FROM users WHERE email = $1', [email]);
   ```

8. **Never import `pool` outside of repository files.**
   Database access belongs in the repository layer only. Services should not touch the pool directly.

### Git rules

9. **Migration files always ship with their feature.**
   Same PR as the code that uses the new schema. Not before. Not after. Together.

10. **Always run `npm run migrate` after pulling.**
    Before starting work after a pull, migrate. Before running tests, migrate. Make it a reflex.

---

## Command I used:
```bash
pg_isready
# If not ready, start Postgres (Mac with Homebrew)
brew services start postgresql
```

```bash
psql postgres -c '\du'
# Shows existing users. If your system user is listed, you can connect with peer auth. If not, create a new role:
```

```bash
createdb vibo-db
# If db doesn't exist, create it. If it does, ignore the error.
```
---

## Quick Questions
**Do I need to touch migrations during development?**
Yes — at the very start, to create the tables. After that, only if your schema design changes. If you realise mid-development you need an extra column, create a new migration, run it, then update your queries.

**Do I write queries first or migration first?**
Migration first, always. You cannot test a query against a table that doesn't exist.

**If I change my mind about a column during development, what do I do?**
If you haven't committed yet and it's only on your local machine, you can delete the migration file, drop the table manually, recreate the migration with the right column, and re-run. Once it's committed and others have pulled it — create a new migration that alters the table.

**Where exactly do queries live?** 
In .queries.ts. Only there. Not in the repository, not in the service, not inline in a pool.query() call.

**Does every module follow this exact same pattern?** Yes — queries → repository → service → controller → routes. Every single module. Consistency is what makes a codebase navigable when it grows.

## Quick reference card

| What you want to do | Command |
|---|---|
| Create a new migration | `npm run migration:create <descriptive_name>` |
| Apply pending migrations locally | `npm run migrate` |
| Apply migrations on production | `npm run migrate:prod` |
| Seed local dev data | `npm run seed` |
| After `git pull` | `npm run migrate` |
| Start dev server | `npm run dev` |

| SQL file type | Location | When it runs |
|---|---|---|
| Schema changes | `core/database/migrations/` | `npm run migrate` |
| Required baseline data | `core/database/migrations/` | `npm run migrate` |
| Local dev fake data | `core/database/seeds/` | `npm run seed` (never in prod) |
| App runtime queries | `modules/*/\*.queries.ts` | At request time |