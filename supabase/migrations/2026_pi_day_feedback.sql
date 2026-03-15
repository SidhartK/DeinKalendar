-- Feedback table for the Pi Day 2026 challenge
-- Collects optional post-game feedback from competitors.

CREATE TABLE IF NOT EXISTS pi_day_2026__feedback (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username     TEXT,
  feedback     TEXT        NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE pi_day_2026__feedback ENABLE ROW LEVEL SECURITY;

-- anon can submit feedback
CREATE POLICY "anon_insert_feedback"
  ON pi_day_2026__feedback
  FOR INSERT
  TO anon
  WITH CHECK (TRUE);
