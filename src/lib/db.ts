import Database from 'better-sqlite3';
import path from 'path';

export interface User {
  username: string;
  password_hash: string | null;
}

export interface Entry {
  id: number;
  username: string;
  solutions: number;
  hints_used: number;
  best_solution_seconds: number | null;
  duration_seconds: number;
  completed_at: string;
  is_first_attempt: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  solutions: number;
  hints_used: number;
  best_solution_seconds: number | null;
  completed_at: string;
}

export interface NewEntry {
  username: string;
  solutions: number;
  hints_used: number;
  best_solution_seconds: number | null;
  duration_seconds: number;
}

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = path.join(process.cwd(), 'competition.db');
  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password_hash TEXT
    );

    CREATE TABLE IF NOT EXISTS entries (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      username              TEXT NOT NULL,
      solutions             INTEGER NOT NULL,
      hints_used            INTEGER NOT NULL,
      best_solution_seconds INTEGER,
      duration_seconds      INTEGER NOT NULL,
      completed_at          TEXT NOT NULL,
      is_first_attempt      INTEGER NOT NULL DEFAULT 1
    );
  `);

  return _db;
}

export function findUser(username: string): User | undefined {
  const db = getDb();
  return db.prepare<[string], User>('SELECT * FROM users WHERE username = ?').get(username);
}

export function insertUser(username: string, passwordHash: string | null): void {
  const db = getDb();
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
}

export function insertEntry(entry: NewEntry): void {
  const db = getDb();

  const { count } = db
    .prepare<[string], { count: number }>('SELECT COUNT(*) as count FROM entries WHERE username = ?')
    .get(entry.username)!;

  const isFirstAttempt = count === 0 ? 1 : 0;

  db.prepare(`
    INSERT INTO entries (username, solutions, hints_used, best_solution_seconds, duration_seconds, completed_at, is_first_attempt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.username,
    entry.solutions,
    entry.hints_used,
    entry.best_solution_seconds,
    entry.duration_seconds,
    new Date().toISOString(),
    isFirstAttempt,
  );
}

export function getLeaderboard(): LeaderboardEntry[] {
  const db = getDb();
  const rows = db.prepare<[], Omit<LeaderboardEntry, 'rank'>>(`
    SELECT username, solutions, hints_used, best_solution_seconds, completed_at
    FROM entries
    WHERE is_first_attempt = 1
    ORDER BY solutions DESC, hints_used ASC, best_solution_seconds ASC
  `).all();

  return rows.map((row, i) => ({ rank: i + 1, ...row }));
}

export function getAllEntries(): Entry[] {
  const db = getDb();
  return db.prepare<[], Entry>('SELECT * FROM entries ORDER BY completed_at ASC').all();
}
