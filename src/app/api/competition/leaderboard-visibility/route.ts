import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboardVisibility, setLeaderboardVisibility } from '@/lib/db';

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username');
  if (!username) {
    return NextResponse.json({ error: 'username required' }, { status: 400 });
  }
  try {
    const show = await getLeaderboardVisibility(username);
    return NextResponse.json({ show_on_leaderboard: show });
  } catch (err) {
    console.error('Failed to get leaderboard visibility:', err);
    return NextResponse.json({ error: 'Failed to get visibility' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  let body: { username?: string; show_on_leaderboard?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { username, show_on_leaderboard } = body;
  if (!username || typeof show_on_leaderboard !== 'boolean') {
    return NextResponse.json({ error: 'username and show_on_leaderboard required' }, { status: 400 });
  }

  try {
    await setLeaderboardVisibility(username, show_on_leaderboard);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to set leaderboard visibility:', err);
    return NextResponse.json({ error: 'Failed to update visibility' }, { status: 500 });
  }
}
