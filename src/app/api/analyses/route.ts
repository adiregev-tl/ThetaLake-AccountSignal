import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all cached analyses with creator info, ordered by most recent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('company_analyses')
      .select('id, company_name, provider, model, analysis_data, web_search_used, created_at, updated_at, created_by, updated_by')
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Fetch creator emails in bulk
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const creatorIds = [...new Set((data || []).map((row: any) => row.updated_by || row.created_by).filter(Boolean))];
    let emailMap: Record<string, string> = {};

    if (creatorIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profiles } = await (supabase as any)
        .from('profiles')
        .select('id, email')
        .in('id', creatorIds);

      if (profiles) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        emailMap = Object.fromEntries(profiles.map((p: any) => [p.id, p.email]));
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analyses = (data || []).map((row: any) => ({
      id: row.id,
      companyName: row.company_name,
      provider: row.provider,
      model: row.model,
      sentiment: row.analysis_data?.sentiment || 'NEUTRAL',
      analyzedBy: emailMap[row.updated_by || row.created_by] || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      webSearchUsed: row.web_search_used,
    }));

    return NextResponse.json({ analyses });
  } catch (error) {
    console.error('Analyses listing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
