import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// Single server-side client reused across requests (module-level singleton).
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Shared table name constants ──────────────────────────────────────────────

const USERS_TABLE = 'pi_day_2026__users';
const ENTRIES_TABLE = 'pi_day_2026__entries';
const FEEDBACK_TABLE = 'pi_day_2026__feedback';

// ─── Public types (unchanged contracts) ──────────────────────────────────────

export interface User {
  username: string;
  password_hash: string | null;
}

export type CompetitionType = 'main' | 'mini';

export interface Entry {
  id: number;
  username: string;
  solutions: number;
  hints_used: number;
  best_solution_seconds: number | null;
  duration_seconds: number;
  completed_at: string;
  is_first_attempt: number;
  competition_type: CompetitionType;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  solutions: number;
  hints_used: number;
  best_solution_seconds: number | null;
  completed_at: string;
  competition_type: CompetitionType;
}

export interface NewEntry {
  username: string;
  solutions: number;
  hints_used: number;
  best_solution_seconds: number | null;
  duration_seconds: number;
  competition_type: CompetitionType;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

function dbError(context: string, error: unknown): never {
  throw new Error(`[db] ${context}: ${(error as { message?: string }).message ?? String(error)}`);
}

// ─── Public API (same signatures as the SQLite version) ───────────────────────

export async function findUser(username: string): Promise<User | undefined> {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('username, password_hash')
    .eq('username', username)
    .maybeSingle();

  if (error) dbError('findUser', error);
  return data ?? undefined;
}

export async function insertUser(username: string, passwordHash: string | null): Promise<void> {
  const { error } = await supabase
    .from(USERS_TABLE)
    .insert({ username, password_hash: passwordHash });

  if (error) dbError('insertUser', error);
}

export async function hasExistingEntry(username: string): Promise<boolean> {
  const { count, error } = await supabase
    .from(ENTRIES_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('username', username);

  if (error) dbError('hasExistingEntry', error);
  return (count ?? 0) > 0;
}

export async function insertEntry(entry: NewEntry): Promise<void> {
  // Determine whether this is the user's first submission.
  const { count, error: countError } = await supabase
    .from(ENTRIES_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('username', entry.username);

  if (countError) dbError('insertEntry (count)', countError);

  const isFirstAttempt = (count ?? 0) === 0;

  const { error } = await supabase.from(ENTRIES_TABLE).insert({
    username: entry.username,
    solutions: entry.solutions,
    hints_used: entry.hints_used,
    best_solution_seconds: entry.best_solution_seconds,
    duration_seconds: entry.duration_seconds,
    competition_type: entry.competition_type,
    completed_at: new Date().toISOString(),
    is_first_attempt: isFirstAttempt,
  });

  if (error) dbError('insertEntry', error);
}

export async function getLeaderboard(
  competitionType: CompetitionType = 'main',
  includeTestUsers = false,
): Promise<LeaderboardEntry[]> {
  let query = supabase
    .from(ENTRIES_TABLE)
    .select('username, solutions, hints_used, best_solution_seconds, completed_at, competition_type')
    .eq('is_first_attempt', true)
    .eq('competition_type', competitionType)
    .order('solutions', { ascending: false })
    .order('hints_used', { ascending: true })
    .order('best_solution_seconds', { ascending: true, nullsFirst: false });

  if (!includeTestUsers) {
    query = query.not('username', 'like', 'sktest%');
  }

  const { data, error } = await query;
  if (error) dbError('getLeaderboard', error);

  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    username: row.username,
    solutions: row.solutions,
    hints_used: row.hints_used,
    best_solution_seconds: row.best_solution_seconds,
    completed_at: row.completed_at,
    competition_type: row.competition_type as CompetitionType,
  }));
}

export async function insertFeedback(username: string | null, feedback: string): Promise<void> {
  const { error } = await supabase.from(FEEDBACK_TABLE).insert({
    username: username ?? null,
    feedback,
    submitted_at: new Date().toISOString(),
  });

  if (error) dbError('insertFeedback', error);
}

export async function getAllEntries(): Promise<Entry[]> {
  const { data, error } = await supabase
    .from(ENTRIES_TABLE)
    .select('*')
    .order('completed_at', { ascending: true });

  if (error) dbError('getAllEntries', error);

  // Normalise is_first_attempt to 0/1 integer to match the original Entry shape.
  return (data ?? []).map((row) => ({
    ...row,
    is_first_attempt: row.is_first_attempt ? 1 : 0,
  }));
}
