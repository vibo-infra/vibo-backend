-- Migration: add_seed_table
-- Created at: 2026-03-30T19:05:03.989Z

CREATE TABLE IF NOT EXISTS seeds (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  executed_at TIMESTAMP DEFAULT NOW()
);