-- Add competition_type column to pi_day_2026__entries
-- Valid values: 'main' or 'mini'

ALTER TABLE pi_day_2026__entries
  ADD COLUMN IF NOT EXISTS competition_type TEXT NOT NULL DEFAULT 'main';

-- Drop the old leaderboard index and recreate it to include competition_type.
DROP INDEX IF EXISTS pi_day_2026__entries_leaderboard_idx;

CREATE INDEX pi_day_2026__entries_leaderboard_idx
  ON pi_day_2026__entries (competition_type, solutions DESC, hints_used ASC, best_solution_seconds ASC)
  WHERE is_first_attempt = TRUE;
