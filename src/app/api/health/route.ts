import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/health — lightweight Supabase ping to prevent inactivity pausing.
// Uses the service role key so the query succeeds regardless of RLS policies
// or session state (cron jobs have no user session / cookies).
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // Service role bypasses RLS — safe here, server-only, read-only count.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json(
        { status: 'error', message: error.message, timestamp: new Date().toISOString() },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      userCount: count ?? 0,
    });
  } catch (err) {
    return NextResponse.json(
      { status: 'error', message: err instanceof Error ? err.message : 'Unknown error', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
