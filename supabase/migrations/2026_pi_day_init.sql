-- Pi Day 2026 competition tables, indexes, and RLS policies
-- All objects are prefixed with pi_day_2026__ to avoid collisions.

-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pi_day_2026__users (
  username      TEXT PRIMARY KEY,
  password_hash TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pi_day_2026__entries (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username              TEXT        NOT NULL,
  solutions             INTEGER     NOT NULL,
  hints_used            INTEGER     NOT NULL,
  best_solution_seconds INTEGER,
  duration_seconds      INTEGER     NOT NULL,
  completed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_first_attempt      BOOLEAN     NOT NULL DEFAULT TRUE
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

-- Fast look-up of all entries for a given username (used by is_first_attempt
-- check and the export endpoint).
CREATE INDEX IF NOT EXISTS pi_day_2026__entries_username_idx
  ON pi_day_2026__entries (username);

-- Leaderboard query filters on is_first_attempt and then orders by
-- (solutions DESC, hints_used ASC, best_solution_seconds ASC).
-- A partial index on first-attempt rows keeps leaderboard reads fast.
CREATE INDEX IF NOT EXISTS pi_day_2026__entries_leaderboard_idx
  ON pi_day_2026__entries (solutions DESC, hints_used ASC, best_solution_seconds ASC)
  WHERE is_first_attempt = TRUE;

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE pi_day_2026__users  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pi_day_2026__entries ENABLE ROW LEVEL SECURITY;

-- users: anon can look up a single user by username (login / registration check)
CREATE POLICY "anon_select_users"
  ON pi_day_2026__users
  FOR SELECT
  TO anon
  USING (TRUE);

-- users: anon can register a new row
CREATE POLICY "anon_insert_users"
  ON pi_day_2026__users
  FOR INSERT
  TO anon
  WITH CHECK (TRUE);

-- entries: anon can insert a new entry (submit competition results)
CREATE POLICY "anon_insert_entries"
  ON pi_day_2026__entries
  FOR INSERT
  TO anon
  WITH CHECK (TRUE);

-- entries: anon can read all entries (leaderboard + export)
CREATE POLICY "anon_select_entries"
  ON pi_day_2026__entries
  FOR SELECT
  TO anon
  USING (TRUE);
