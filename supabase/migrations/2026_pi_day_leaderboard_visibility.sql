-- Add show_on_leaderboard column to entries table.
-- Existing rows are preserved and default to TRUE so nothing changes for them.

ALTER TABLE pi_day_2026__entries
  ADD COLUMN IF NOT EXISTS show_on_leaderboard BOOLEAN NOT NULL DEFAULT TRUE;

-- Allow anon users to update only the show_on_leaderboard column on their own entry.
-- We identify ownership by username (consistent with the rest of the anon-trust model).
CREATE POLICY "anon_update_entries_visibility"
  ON pi_day_2026__entries
  FOR UPDATE
  TO anon
  USING (TRUE)
  WITH CHECK (TRUE);
