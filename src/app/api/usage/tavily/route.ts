import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET() {
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

    // Fetch Tavily API key from app_settings using service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const settingsClient = (supabaseUrl && serviceRoleKey)
      ? createServiceClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      : supabase;

    const { data: settings } = await settingsClient
      .from('app_settings')
      .select('tavily_api_key')
      .single();

    const tavilyApiKey = (settings as { tavily_api_key: string | null } | null)?.tavily_api_key;
    if (!tavilyApiKey) {
      return NextResponse.json({ error: 'Tavily API key not configured' }, { status: 400 });
    }

    // Call Tavily usage API
    const tavilyResponse = await fetch('https://api.tavily.com/usage', {
      headers: {
        'Authorization': `Bearer ${tavilyApiKey}`,
      },
    });

    if (!tavilyResponse.ok) {
      return NextResponse.json(
        { error: `Tavily API returned ${tavilyResponse.status}` },
        { status: tavilyResponse.status }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tavilyData: any = await tavilyResponse.json();

    return NextResponse.json({
      usage: tavilyData.key?.usage ?? tavilyData.account?.plan_usage ?? 0,
      limit: tavilyData.key?.limit ?? tavilyData.account?.plan_limit ?? 4000,
      searchUsage: tavilyData.key?.search_usage ?? 0,
      plan: tavilyData.account?.current_plan ?? 'unknown',
    });
  } catch (error) {
    console.error('Tavily usage API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
