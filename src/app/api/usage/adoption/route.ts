import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserAdoptionStats } from '@/lib/services/usageLogger';

// GET /api/usage/adoption?period=thisMonth
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const profileData = profile as { role: string } | null;
    if (!profileData || profileData.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse period query param
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'thisMonth';

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today': {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      }
      case 'thisWeek': {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        break;
      }
      case 'allTime': {
        startDate = new Date(2020, 0, 1);
        break;
      }
      case 'thisMonth':
      default: {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      }
    }

    const data = await getUserAdoptionStats(supabase, startDate, now);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Adoption stats API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
