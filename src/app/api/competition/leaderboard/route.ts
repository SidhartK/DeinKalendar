import { NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/db';

export async function GET() {
  try {
    const leaderboard = getLeaderboard();
    return NextResponse.json({ leaderboard });
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
