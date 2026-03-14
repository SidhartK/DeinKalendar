import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { findUser, insertUser } from '@/lib/db';

export async function POST(req: NextRequest) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const existing = findUser(username);

  if (!existing) {
    // New user — register them
    const hash = password ? await bcrypt.hash(password, 10) : null;
    insertUser(username, hash);
    return NextResponse.json({ ok: true });
  }

  // Existing user
  if (existing.password_hash === null) {
    // No password required
    return NextResponse.json({ ok: true });
  }

  // Password required — validate it
  if (!password) {
    return NextResponse.json({ error: 'Password required' }, { status: 401 });
  }

  const match = await bcrypt.compare(password, existing.password_hash);
  if (!match) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
