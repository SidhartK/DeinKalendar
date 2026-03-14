import { NextRequest, NextResponse } from 'next/server';
import { insertEntry } from '@/lib/db';

export async function POST(req: NextRequest) {
  let body: {
    username?: unknown;
    solutions?: unknown;
    hints_used?: unknown;
    best_solution_seconds?: unknown;
    duration_seconds?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const username =
    typeof body.username === 'string' ? body.username.trim() : '';
  const solutions =
    typeof body.solutions === 'number' ? body.solutions : null;
  const hints_used =
    typeof body.hints_used === 'number' ? body.hints_used : null;
  const best_solution_seconds =
    typeof body.best_solution_seconds === 'number'
      ? body.best_solution_seconds
      : null;
  const duration_seconds =
    typeof body.duration_seconds === 'number' ? body.duration_seconds : null;

  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 });
  }
  if (solutions === null || solutions < 0) {
    return NextResponse.json({ error: 'solutions must be a non-negative number' }, { status: 400 });
  }
  if (hints_used === null || hints_used < 0) {
    return NextResponse.json({ error: 'hints_used must be a non-negative number' }, { status: 400 });
  }
  if (duration_seconds === null || duration_seconds < 0) {
    return NextResponse.json({ error: 'duration_seconds must be a non-negative number' }, { status: 400 });
  }

  try {
    insertEntry({ username, solutions, hints_used, best_solution_seconds, duration_seconds });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to insert entry:', err);
    return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 });
  }
}
