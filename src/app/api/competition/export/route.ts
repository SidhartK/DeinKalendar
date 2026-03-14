import { NextRequest, NextResponse } from 'next/server';
import { getAllEntries } from '@/lib/db';

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get('pi_admin');
  if (!cookie || cookie.value !== '1') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const entries = getAllEntries();

    const header = 'Username,Solutions,Hints Used,Best Time (s),Duration (s),Completed At,Is First Attempt\n';
    const rows = entries.map((e) =>
      [
        `"${e.username.replace(/"/g, '""')}"`,
        e.solutions,
        e.hints_used,
        e.best_solution_seconds ?? '',
        e.duration_seconds,
        `"${e.completed_at}"`,
        e.is_first_attempt,
      ].join(',')
    );
    const csv = header + rows.join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="competition-results.csv"',
      },
    });
  } catch (err) {
    console.error('Failed to export entries:', err);
    return NextResponse.json({ error: 'Failed to export entries' }, { status: 500 });
  }
}
