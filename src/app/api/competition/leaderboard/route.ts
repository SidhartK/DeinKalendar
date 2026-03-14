import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const isAdmin = req.cookies.get('pi_admin')?.value === '1';
    const leaderboard = getLeaderboard(isAdmin);
    return NextResponse.json({ leaderboard });
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
