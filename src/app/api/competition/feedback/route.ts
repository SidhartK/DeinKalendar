import { NextRequest, NextResponse } from 'next/server';
import { insertFeedback } from '@/lib/db';

const MAX_FEEDBACK_LENGTH = 2000;

export async function POST(req: NextRequest) {
  let body: { username?: unknown; feedback?: unknown };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const username =
    typeof body.username === 'string' && body.username.trim()
      ? body.username.trim()
      : null;

  const feedback =
    typeof body.feedback === 'string' ? body.feedback.trim() : '';

  if (!feedback) {
    return NextResponse.json({ error: 'feedback is required' }, { status: 400 });
  }

  if (feedback.length > MAX_FEEDBACK_LENGTH) {
    return NextResponse.json(
      { error: `feedback must be ${MAX_FEEDBACK_LENGTH} characters or fewer` },
      { status: 400 },
    );
  }

  try {
    await insertFeedback(username, feedback);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to insert feedback:', err);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}
