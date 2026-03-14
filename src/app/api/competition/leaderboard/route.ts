import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, type CompetitionType } from '@/lib/db';

const VALID_MODES = new Set<CompetitionType>(['main', 'mini']);

export async function GET(req: NextRequest) {
  try {
    const isAdmin = req.cookies.get('pi_admin')?.value === '1';
    const modeParam = req.nextUrl.searchParams.get('mode');
    const mode: CompetitionType =
      modeParam && VALID_MODES.has(modeParam as CompetitionType)
        ? (modeParam as CompetitionType)
        : 'main';
    const leaderboard = await getLeaderboard(mode, isAdmin);
    return NextResponse.json({ leaderboard });
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
