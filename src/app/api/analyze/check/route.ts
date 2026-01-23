import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ProviderName } from '@/types/analysis';

interface CacheCheckResponse {
  exists: boolean;
  cacheInfo?: {
    analyzedAt: string;
    analyzedBy?: string;
    provider: ProviderName;
    ageMinutes: number;
    isStale: boolean; // > 24 hours old
  };
}

export async function POST(request: NextRequest) {
  try {
    const { companyName } = await request.json();

    if (!companyName?.trim()) {
      return NextResponse.json({ exists: false });
    }

    const supabase = await createClient();
    const companyNameLower = companyName.trim().toLowerCase();

    // Check for cached analysis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cachedAnalysis } = await (supabase as any)
      .from('company_analyses')
      .select(`
        updated_at,
        provider,
        creator:profiles!company_analyses_created_by_fkey(email)
      `)
      .eq('company_name_lower', companyNameLower)
      .single();

    if (!cachedAnalysis) {
      return NextResponse.json<CacheCheckResponse>({ exists: false });
    }

    const updatedAt = new Date(cachedAnalysis.updated_at);
    const ageMinutes = Math.floor((Date.now() - updatedAt.getTime()) / 60000);
    const isStale = ageMinutes > 24 * 60; // > 24 hours

    return NextResponse.json<CacheCheckResponse>({
      exists: true,
      cacheInfo: {
        analyzedAt: cachedAnalysis.updated_at,
        analyzedBy: cachedAnalysis.creator?.email || undefined,
        provider: cachedAnalysis.provider as ProviderName,
        ageMinutes,
        isStale
      }
    });
  } catch (error) {
    console.error('Cache check error:', error);
    // On error, just say no cache exists (don't block the user)
    return NextResponse.json<CacheCheckResponse>({ exists: false });
  }
}
