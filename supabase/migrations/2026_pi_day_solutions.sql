-- Store individual solution states found during a competition session.
-- Each row represents one unique solution a competitor discovered.

CREATE TABLE IF NOT EXISTS pi_day_2026__solutions (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username         TEXT        NOT NULL,
  competition_type TEXT        NOT NULL DEFAULT 'main',
  solution_key     TEXT        NOT NULL,
  placed_pieces    JSONB       NOT NULL,
  found_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pi_day_2026__solutions_username_idx
  ON pi_day_2026__solutions (username);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE pi_day_2026__solutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_solutions"
  ON pi_day_2026__solutions
  FOR INSERT
  TO anon
  WITH CHECK (TRUE);

CREATE POLICY "anon_select_solutions"
  ON pi_day_2026__solutions
  FOR SELECT
  TO anon
  USING (TRUE);
