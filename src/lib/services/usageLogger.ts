import { SupabaseClient } from '@supabase/supabase-js';
import {
  calculateAICost,
  calculateSearchCost,
  estimateTokens,
  TAVILY_QUERIES_PER_ANALYSIS,
} from '@/lib/config/pricing';

export interface UsageLogEntry {
  userId?: string;
  userEmail?: string;
  companyName: string;
  aiProvider: string;
  aiModel: string;
  promptText: string;
  responseText: string;
  searchProvider: string;
  searchQueriesUsed?: number;
  cached: boolean;
  durationMs?: number;
}

/**
 * Log usage and costs to the database
 */
export async function logUsage(
  supabase: SupabaseClient,
  entry: UsageLogEntry
): Promise<void> {
  try {
    // Estimate tokens
    const inputTokens = estimateTokens(entry.promptText);
    const outputTokens = estimateTokens(entry.responseText);

    // Calculate costs
    const aiCost = entry.cached ? 0 : calculateAICost(
      entry.aiProvider,
      entry.aiModel,
      inputTokens,
      outputTokens
    );

    const searchQueries = entry.cached ? 0 : (entry.searchQueriesUsed ?? TAVILY_QUERIES_PER_ANALYSIS);
    const searchCost = entry.cached ? 0 : calculateSearchCost(entry.searchProvider, searchQueries);

    const totalCost = aiCost + searchCost;

    // Insert log entry
    const { error } = await supabase
      .from('usage_logs')
      .insert({
        user_id: entry.userId || null,
        user_email: entry.userEmail || null,
        company_name: entry.companyName,
        ai_provider: entry.aiProvider,
        ai_model: entry.aiModel,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        ai_cost_usd: aiCost,
        search_provider: entry.searchProvider,
        search_queries: searchQueries,
        search_cost_usd: searchCost,
        total_cost_usd: totalCost,
        cached: entry.cached,
        duration_ms: entry.durationMs || null,
      });

    if (error) {
      console.error('Failed to log usage:', error);
    }
  } catch (err) {
    // Don't fail the request if logging fails
    console.error('Usage logging error:', err);
  }
}

export interface UsageSummary {
  totalRequests: number;
  totalCost: number;
  aiCost: number;
  searchCost: number;
  byProvider: Record<string, { requests: number; cost: number }>;
  bySearchProvider: Record<string, { queries: number; cost: number }>;
  byUser: Record<string, { email: string; requests: number; cost: number }>;
}

/**
 * Get usage summary for a time period
 */
export async function getUsageSummary(
  supabase: SupabaseClient,
  startDate: Date,
  endDate: Date
): Promise<UsageSummary> {
  const { data, error } = await supabase
    .from('usage_logs')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch usage:', error);
    return {
      totalRequests: 0,
      totalCost: 0,
      aiCost: 0,
      searchCost: 0,
      byProvider: {},
      bySearchProvider: {},
      byUser: {},
    };
  }

  const summary: UsageSummary = {
    totalRequests: data.length,
    totalCost: 0,
    aiCost: 0,
    searchCost: 0,
    byProvider: {},
    bySearchProvider: {},
    byUser: {},
  };

  for (const log of data) {
    const totalCost = parseFloat(log.total_cost_usd) || 0;
    const aiCost = parseFloat(log.ai_cost_usd) || 0;
    const searchCost = parseFloat(log.search_cost_usd) || 0;

    summary.totalCost += totalCost;
    summary.aiCost += aiCost;
    summary.searchCost += searchCost;

    // By AI provider
    const provider = log.ai_provider;
    if (!summary.byProvider[provider]) {
      summary.byProvider[provider] = { requests: 0, cost: 0 };
    }
    summary.byProvider[provider].requests++;
    summary.byProvider[provider].cost += totalCost;

    // By search provider
    const searchProvider = log.search_provider;
    if (searchProvider && searchProvider !== 'none' && searchCost > 0) {
      if (!summary.bySearchProvider[searchProvider]) {
        summary.bySearchProvider[searchProvider] = { queries: 0, cost: 0 };
      }
      summary.bySearchProvider[searchProvider].queries += parseInt(log.search_queries) || 0;
      summary.bySearchProvider[searchProvider].cost += searchCost;
    }

    // By user
    const userId = log.user_id || 'anonymous';
    if (!summary.byUser[userId]) {
      summary.byUser[userId] = { email: log.user_email || 'Anonymous', requests: 0, cost: 0 };
    }
    summary.byUser[userId].requests++;
    summary.byUser[userId].cost += totalCost;
  }

  return summary;
}

// ---------------------------------------------------------------------------
// Per-user adoption stats
// ---------------------------------------------------------------------------

export interface UserAdoptionStats {
  userId: string;
  email: string;
  displayName: string | null;
  totalAnalyses: number;
  freshAnalyses: number;
  cacheHits: number;
  cacheHitRate: number;           // 0–1
  uniqueCompanies: number;
  totalCost: number;
  estimatedCostSaved: number;
  lastActive: string | null;      // ISO string
  firstSeen: string;              // profiles.created_at
  avgResponseMs: number | null;   // fresh analyses only
  preferredProvider: string;
  topCompanies: string[];         // top 3
}

export interface AdoptionSummary {
  totalRegisteredUsers: number;
  activeUsersInPeriod: number;
  overallCacheHitRate: number;    // 0–1
  totalCostSaved: number;
  avgAnalysesPerActiveUser: number;
  users: UserAdoptionStats[];
}

/**
 * Get per-user adoption stats for a time period
 */
export async function getUserAdoptionStats(
  supabase: SupabaseClient,
  startDate: Date,
  endDate: Date
): Promise<AdoptionSummary> {
  // Fetch usage logs and profiles in parallel
  const [logsResult, profilesResult] = await Promise.all([
    supabase
      .from('usage_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, email, display_name, created_at'),
  ]);

  const logs = logsResult.data || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profiles: Array<{ id: string; email: string; display_name: string | null; created_at: string }> = (profilesResult.data as any) || [];

  // Compute global avg fresh cost for cost-saved estimation
  let totalFreshCost = 0;
  let totalFreshCount = 0;
  for (const log of logs) {
    if (!log.cached) {
      totalFreshCost += parseFloat(log.total_cost_usd) || 0;
      totalFreshCount++;
    }
  }
  const avgFreshCost = totalFreshCount > 0 ? totalFreshCost / totalFreshCount : 0;

  // Aggregate per user
  interface UserAccum {
    total: number;
    fresh: number;
    cached: number;
    cost: number;
    companies: Map<string, number>;
    providers: Map<string, number>;
    lastActive: string | null;
    durationSumMs: number;
    durationCount: number;
  }

  const userMap = new Map<string, UserAccum>();

  for (const log of logs) {
    const uid = log.user_id || 'anonymous';
    let acc = userMap.get(uid);
    if (!acc) {
      acc = {
        total: 0, fresh: 0, cached: 0, cost: 0,
        companies: new Map(), providers: new Map(),
        lastActive: null, durationSumMs: 0, durationCount: 0,
      };
      userMap.set(uid, acc);
    }

    acc.total++;
    if (log.cached) {
      acc.cached++;
    } else {
      acc.fresh++;
    }
    acc.cost += parseFloat(log.total_cost_usd) || 0;

    // Company frequency
    const companyLower = (log.company_name || '').toLowerCase();
    acc.companies.set(companyLower, (acc.companies.get(companyLower) || 0) + 1);

    // Provider frequency
    const prov = log.ai_provider || 'unknown';
    acc.providers.set(prov, (acc.providers.get(prov) || 0) + 1);

    // Last active
    if (!acc.lastActive || log.created_at > acc.lastActive) {
      acc.lastActive = log.created_at;
    }

    // Duration (fresh only)
    if (!log.cached && log.duration_ms) {
      acc.durationSumMs += parseInt(log.duration_ms) || 0;
      acc.durationCount++;
    }
  }

  // Build per-user stats — include ALL registered users
  const userStats: UserAdoptionStats[] = [];
  let globalCacheHits = 0;
  let globalTotal = 0;
  let globalCostSaved = 0;

  for (const profile of profiles) {
    const acc = userMap.get(profile.id);
    const total = acc?.total ?? 0;
    const fresh = acc?.fresh ?? 0;
    const cached = acc?.cached ?? 0;
    const cacheHitRate = total > 0 ? cached / total : 0;
    const costSaved = cached * avgFreshCost;

    // Preferred provider
    let preferredProvider = '—';
    if (acc?.providers.size) {
      let maxCount = 0;
      for (const [prov, count] of acc.providers) {
        if (count > maxCount) { maxCount = count; preferredProvider = prov; }
      }
    }

    // Top 3 companies
    const topCompanies: string[] = [];
    if (acc?.companies.size) {
      const sorted = [...acc.companies.entries()].sort((a, b) => b[1] - a[1]);
      for (let i = 0; i < Math.min(3, sorted.length); i++) {
        topCompanies.push(sorted[i][0]);
      }
    }

    globalCacheHits += cached;
    globalTotal += total;
    globalCostSaved += costSaved;

    userStats.push({
      userId: profile.id,
      email: profile.email,
      displayName: profile.display_name,
      totalAnalyses: total,
      freshAnalyses: fresh,
      cacheHits: cached,
      cacheHitRate,
      uniqueCompanies: acc?.companies.size ?? 0,
      totalCost: acc?.cost ?? 0,
      estimatedCostSaved: costSaved,
      lastActive: acc?.lastActive ?? null,
      firstSeen: profile.created_at,
      avgResponseMs: (acc && acc.durationCount > 0) ? Math.round(acc.durationSumMs / acc.durationCount) : null,
      preferredProvider,
      topCompanies,
    });
  }

  // Also include anonymous if present
  const anonAcc = userMap.get('anonymous');
  if (anonAcc) {
    const costSaved = anonAcc.cached * avgFreshCost;
    globalCacheHits += anonAcc.cached;
    globalTotal += anonAcc.total;
    globalCostSaved += costSaved;

    let preferredProvider = '—';
    let maxCount = 0;
    for (const [prov, count] of anonAcc.providers) {
      if (count > maxCount) { maxCount = count; preferredProvider = prov; }
    }
    const topCompanies = [...anonAcc.companies.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);

    userStats.push({
      userId: 'anonymous',
      email: 'Anonymous / Guest',
      displayName: null,
      totalAnalyses: anonAcc.total,
      freshAnalyses: anonAcc.fresh,
      cacheHits: anonAcc.cached,
      cacheHitRate: anonAcc.total > 0 ? anonAcc.cached / anonAcc.total : 0,
      uniqueCompanies: anonAcc.companies.size,
      totalCost: anonAcc.cost,
      estimatedCostSaved: costSaved,
      lastActive: anonAcc.lastActive,
      firstSeen: '—',
      avgResponseMs: anonAcc.durationCount > 0 ? Math.round(anonAcc.durationSumMs / anonAcc.durationCount) : null,
      preferredProvider,
      topCompanies,
    });
  }

  // Sort by total analyses descending
  userStats.sort((a, b) => b.totalAnalyses - a.totalAnalyses);

  const activeCount = userStats.filter(u => u.totalAnalyses > 0).length;

  return {
    totalRegisteredUsers: profiles.length,
    activeUsersInPeriod: activeCount,
    overallCacheHitRate: globalTotal > 0 ? globalCacheHits / globalTotal : 0,
    totalCostSaved: globalCostSaved,
    avgAnalysesPerActiveUser: activeCount > 0 ? globalTotal / activeCount : 0,
    users: userStats,
  };
}

/**
 * Check if costs exceed thresholds and return alerts
 */
export async function checkCostAlerts(
  supabase: SupabaseClient
): Promise<{ daily: boolean; weekly: boolean; monthly: boolean; thresholds: { daily: number; weekly: number; monthly: number }; current: { daily: number; weekly: number; monthly: number } }> {
  // Get alert settings
  const { data: alertSettings } = await supabase
    .from('cost_alerts')
    .select('*')
    .single();

  const thresholds = {
    daily: parseFloat(alertSettings?.daily_threshold) || 10,
    weekly: parseFloat(alertSettings?.weekly_threshold) || 50,
    monthly: parseFloat(alertSettings?.monthly_threshold) || 200,
  };

  // Calculate current costs
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [dailySummary, weeklySummary, monthlySummary] = await Promise.all([
    getUsageSummary(supabase, startOfDay, now),
    getUsageSummary(supabase, startOfWeek, now),
    getUsageSummary(supabase, startOfMonth, now),
  ]);

  return {
    daily: dailySummary.totalCost >= thresholds.daily,
    weekly: weeklySummary.totalCost >= thresholds.weekly,
    monthly: monthlySummary.totalCost >= thresholds.monthly,
    thresholds,
    current: {
      daily: dailySummary.totalCost,
      weekly: weeklySummary.totalCost,
      monthly: monthlySummary.totalCost,
    },
  };
}
