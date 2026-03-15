import { NextRequest, NextResponse } from 'next/server';
import { getSolutionsForUser } from '@/lib/db';

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username');
  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 });
  }

  try {
    const solutions = await getSolutionsForUser(username);
    return NextResponse.json({ solutions });
  } catch (err) {
    console.error('Failed to fetch solutions:', err);
    return NextResponse.json({ error: 'Failed to fetch solutions' }, { status: 500 });
  }
}
