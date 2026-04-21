'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, AlertTriangle, RefreshCw, Users, Cpu, Search, Clock, Divide, ChevronDown, ChevronRight, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCost } from '@/lib/config/pricing';

interface UsagePeriod {
  totalRequests: number;
  totalCost: number;
  aiCost: number;
  searchCost: number;
  byProvider: Record<string, { requests: number; cost: number }>;
  bySearchProvider: Record<string, { queries: number; cost: number }>;
  byUser: Record<string, { email: string; requests: number; cost: number }>;
}

interface RecentLog {
  id: string;
  createdAt: string;
  userEmail: string | null;
  companyName: string;
  aiProvider: string;
  aiModel: string;
  totalCost: number;
  cached: boolean;
}

interface UsageData {
  today: UsagePeriod;
  thisWeek: UsagePeriod;
  thisMonth: UsagePeriod;
  allTime: UsagePeriod;
  alerts: {
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
    thresholds: { daily: number; weekly: number; monthly: number };
    current: { daily: number; weekly: number; monthly: number };
  };
  recentLogs: RecentLog[];
}

interface TavilyUsageData {
  usage: number;
  limit: number;
  searchUsage: number;
  plan: string;
}

interface UserAdoptionStats {
  userId: string;
  email: string;
  displayName: string | null;
  totalAnalyses: number;
  freshAnalyses: number;
  cacheHits: number;
  cacheHitRate: number;
  uniqueCompanies: number;
  totalCost: number;
  estimatedCostSaved: number;
  lastActive: string | null;
  firstSeen: string;
  avgResponseMs: number | null;
  preferredProvider: string;
  topCompanies: string[];
}

interface AdoptionSummary {
  totalRegisteredUsers: number;
  activeUsersInPeriod: number;
  overallCacheHitRate: number;
  totalCostSaved: number;
  avgAnalysesPerActiveUser: number;
  users: UserAdoptionStats[];
}

type AdoptionSortKey = 'email' | 'totalAnalyses' | 'freshAnalyses' | 'cacheHits' | 'cacheHitRate' | 'uniqueCompanies' | 'totalCost' | 'estimatedCostSaved';

const ADOPTION_PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'allTime', label: 'All Time' },
] as const;

export function UsageCosts() {
  const [data, setData] = useState<UsageData | null>(null);
  const [tavilyUsage, setTavilyUsage] = useState<TavilyUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingThresholds, setEditingThresholds] = useState(false);
  const [thresholds, setThresholds] = useState({ daily: 10, weekly: 50, monthly: 200 });
  const [adoptionData, setAdoptionData] = useState<AdoptionSummary | null>(null);
  const [adoptionPeriod, setAdoptionPeriod] = useState<string>('thisMonth');
  const [adoptionLoading, setAdoptionLoading] = useState(false);
  const [adoptionSort, setAdoptionSort] = useState<{ key: AdoptionSortKey; dir: 'asc' | 'desc' }>({ key: 'totalAnalyses', dir: 'desc' });
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [usageResponse, tavilyResponse] = await Promise.all([
        fetch('/api/usage'),
        fetch('/api/usage/tavily').catch(() => null),
      ]);
      if (!usageResponse.ok) {
        throw new Error('Failed to fetch usage data');
      }
      const usageData = await usageResponse.json();
      setData(usageData);
      setThresholds(usageData.alerts.thresholds);

      if (tavilyResponse?.ok) {
        const tavilyData = await tavilyResponse.json();
        setTavilyUsage(tavilyData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAdoption = useCallback(async (period: string) => {
    setAdoptionLoading(true);
    try {
      const res = await fetch(`/api/usage/adoption?period=${period}`);
      if (res.ok) {
        setAdoptionData(await res.json());
      }
    } catch {
      // Non-critical — don't block the main dashboard
    } finally {
      setAdoptionLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  useEffect(() => {
    fetchAdoption(adoptionPeriod);
  }, [fetchAdoption, adoptionPeriod]);

  const saveThresholds = async () => {
    try {
      const response = await fetch('/api/usage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyThreshold: thresholds.daily,
          weeklyThreshold: thresholds.weekly,
          monthlyThreshold: thresholds.monthly,
        }),
      });
      if (!response.ok) throw new Error('Failed to save thresholds');
      setEditingThresholds(false);
      fetchUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <Button variant="outline" onClick={fetchUsage}>Retry</Button>
      </div>
    );
  }

  if (!data) return null;

  const hasAlerts = data.alerts.daily || data.alerts.weekly || data.alerts.monthly;

  return (
    <div className="space-y-6">
      {/* Alerts Banner */}
      {hasAlerts && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Cost Alert</span>
          </div>
          <div className="text-sm text-amber-300/80 space-y-1">
            {data.alerts.daily && (
              <p>Daily threshold exceeded: {formatCost(data.alerts.current.daily)} / {formatCost(data.alerts.thresholds.daily)}</p>
            )}
            {data.alerts.weekly && (
              <p>Weekly threshold exceeded: {formatCost(data.alerts.current.weekly)} / {formatCost(data.alerts.thresholds.weekly)}</p>
            )}
            {data.alerts.monthly && (
              <p>Monthly threshold exceeded: {formatCost(data.alerts.current.monthly)} / {formatCost(data.alerts.thresholds.monthly)}</p>
            )}
          </div>
        </div>
      )}

      {/* Cost Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CostCard title="Today" data={data.today} />
        <CostCard title="This Week" data={data.thisWeek} />
        <CostCard title="This Month" data={data.thisMonth} />
        <CostCard title="All Time" data={data.allTime} />
      </div>

      {/* Tavily Plan Usage */}
      {tavilyUsage && (
        <div className="bg-card/50 border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Tavily Plan
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span className="text-foreground capitalize">{tavilyUsage.plan}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monthly Cost</span>
              <span className="text-foreground">$30.00/month</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Credits Used</span>
              <span className={`text-foreground ${tavilyUsage.usage / tavilyUsage.limit > 0.9 ? 'text-amber-400' : ''}`}>
                {tavilyUsage.usage.toLocaleString()} / {tavilyUsage.limit.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-1">
              <div
                className={`h-2 rounded-full transition-all ${
                  tavilyUsage.usage / tavilyUsage.limit > 0.9 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (tavilyUsage.usage / tavilyUsage.limit) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {(tavilyUsage.limit - tavilyUsage.usage).toLocaleString()} credits remaining this billing cycle
            </p>
          </div>
        </div>
      )}

      {/* Breakdown Section */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* By Provider */}
        <div className="bg-card/50 border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            By Provider (This Month)
          </h3>
          <div className="space-y-2">
            {Object.entries(data.thisMonth.byProvider).length > 0 ? (
              Object.entries(data.thisMonth.byProvider).map(([provider, stats]) => (
                <div key={provider} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{provider}</span>
                  <span className="text-foreground">
                    {stats.requests} req · {formatCost(stats.cost)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No data yet</p>
            )}
          </div>
        </div>

        {/* By Search Engine */}
        <div className="bg-card/50 border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Search className="w-4 h-4" />
            By Search Engine (This Month)
          </h3>
          <div className="space-y-2">
            {Object.entries(data.thisMonth.bySearchProvider || {}).length > 0 ? (
              Object.entries(data.thisMonth.bySearchProvider).map(([provider, stats]) => (
                <div key={provider} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{provider}</span>
                  <span className="text-foreground">
                    {stats.queries} queries · {formatCost(stats.cost)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No web search usage</p>
            )}
          </div>
        </div>
      </div>

      {/* User Adoption */}
      <UserAdoptionPanel
        data={adoptionData}
        loading={adoptionLoading}
        period={adoptionPeriod}
        onPeriodChange={setAdoptionPeriod}
        sort={adoptionSort}
        onSortChange={setAdoptionSort}
        expandedUser={expandedUser}
        onToggleExpand={(uid) => setExpandedUser(expandedUser === uid ? null : uid)}
      />

      {/* Thresholds */}
      <div className="bg-card/50 border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alert Thresholds
          </h3>
          {!editingThresholds ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingThresholds(true)}>
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingThresholds(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveThresholds}>
                Save
              </Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Daily</label>
            {editingThresholds ? (
              <Input
                type="number"
                value={thresholds.daily}
                onChange={(e) => setThresholds(t => ({ ...t, daily: parseFloat(e.target.value) || 0 }))}
                className="h-8 mt-1"
              />
            ) : (
              <p className="text-foreground font-medium">{formatCost(thresholds.daily)}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Weekly</label>
            {editingThresholds ? (
              <Input
                type="number"
                value={thresholds.weekly}
                onChange={(e) => setThresholds(t => ({ ...t, weekly: parseFloat(e.target.value) || 0 }))}
                className="h-8 mt-1"
              />
            ) : (
              <p className="text-foreground font-medium">{formatCost(thresholds.weekly)}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Monthly</label>
            {editingThresholds ? (
              <Input
                type="number"
                value={thresholds.monthly}
                onChange={(e) => setThresholds(t => ({ ...t, monthly: parseFloat(e.target.value) || 0 }))}
                className="h-8 mt-1"
              />
            ) : (
              <p className="text-foreground font-medium">{formatCost(thresholds.monthly)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card/50 border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Recent Activity
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {data.recentLogs.length > 0 ? (
            data.recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <span className="text-foreground truncate block">{log.companyName}</span>
                  <span className="text-muted-foreground text-xs">
                    {log.userEmail || 'Unknown'} · {log.aiProvider}
                    {log.cached && <span className="text-blue-400 ml-1">(cached)</span>}
                  </span>
                </div>
                <div className="text-right">
                  <span className={log.cached ? 'text-muted-foreground' : 'text-emerald-400'}>
                    {formatCost(log.totalCost)}
                  </span>
                  <span className="text-muted-foreground text-xs block">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">No activity yet</p>
          )}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={fetchUsage}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function cacheRateColor(rate: number): string {
  if (rate >= 0.5) return 'text-emerald-500';
  if (rate >= 0.2) return 'text-amber-500';
  return 'text-red-400';
}

function cacheRateBg(rate: number): string {
  if (rate >= 0.5) return 'bg-emerald-500';
  if (rate >= 0.2) return 'bg-amber-500';
  return 'bg-red-400';
}

// ---------------------------------------------------------------------------
// User Adoption Panel
// ---------------------------------------------------------------------------

function UserAdoptionPanel({
  data,
  loading,
  period,
  onPeriodChange,
  sort,
  onSortChange,
  expandedUser,
  onToggleExpand,
}: {
  data: AdoptionSummary | null;
  loading: boolean;
  period: string;
  onPeriodChange: (p: string) => void;
  sort: { key: AdoptionSortKey; dir: 'asc' | 'desc' };
  onSortChange: (s: { key: AdoptionSortKey; dir: 'asc' | 'desc' }) => void;
  expandedUser: string | null;
  onToggleExpand: (uid: string) => void;
}) {
  const toggleSort = (key: AdoptionSortKey) => {
    if (sort.key === key) {
      onSortChange({ key, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      onSortChange({ key, dir: 'desc' });
    }
  };

  const sortedUsers = data ? [...data.users].sort((a, b) => {
    const aVal = a[sort.key];
    const bVal = b[sort.key];
    const cmp = typeof aVal === 'string'
      ? (aVal as string).localeCompare(bVal as string)
      : (aVal as number) - (bVal as number);
    return sort.dir === 'asc' ? cmp : -cmp;
  }) : [];

  return (
    <div className="bg-card/50 border border-border rounded-lg p-4">
      {/* Header + Period Tabs */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Users className="w-4 h-4" />
          User Adoption
        </h3>
        <div className="flex gap-1">
          {ADOPTION_PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onPeriodChange(key)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                period === key
                  ? 'bg-foreground/10 text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <p className="text-muted-foreground text-sm py-4">Failed to load adoption data</p>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-background/50 border border-border/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Registered</p>
              <p className="text-lg font-bold text-foreground">{data.totalRegisteredUsers}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">all time</p>
            </div>
            <div className="bg-background/50 border border-border/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Active</p>
              <p className="text-lg font-bold text-foreground">{data.activeUsersInPeriod}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {data.totalRegisteredUsers > 0
                  ? `${Math.round((data.activeUsersInPeriod / data.totalRegisteredUsers) * 100)}% of registered`
                  : 'this period'}
              </p>
            </div>
            <div className="bg-background/50 border border-border/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Cache Hit Rate</p>
              <p className={`text-lg font-bold ${cacheRateColor(data.overallCacheHitRate)}`}>
                {(data.overallCacheHitRate * 100).toFixed(0)}%
              </p>
              <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                <div
                  className={`h-1.5 rounded-full transition-all ${cacheRateBg(data.overallCacheHitRate)}`}
                  style={{ width: `${Math.min(100, data.overallCacheHitRate * 100)}%` }}
                />
              </div>
            </div>
            <div className="bg-background/50 border border-border/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Est. Cost Saved</p>
              <p className="text-lg font-bold text-emerald-500">{formatCost(data.totalCostSaved)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">from cache reuse</p>
            </div>
          </div>

          {/* User Table */}
          {sortedUsers.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No users found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <SortHeader label="User" sortKey="email" current={sort} onSort={toggleSort} />
                    <SortHeader label="Total" sortKey="totalAnalyses" current={sort} onSort={toggleSort} align="right" />
                    <SortHeader label="Fresh" sortKey="freshAnalyses" current={sort} onSort={toggleSort} align="right" />
                    <SortHeader label="Cached" sortKey="cacheHits" current={sort} onSort={toggleSort} align="right" />
                    <SortHeader label="Cache %" sortKey="cacheHitRate" current={sort} onSort={toggleSort} align="right" />
                    <SortHeader label="Companies" sortKey="uniqueCompanies" current={sort} onSort={toggleSort} align="right" />
                    <SortHeader label="Cost" sortKey="totalCost" current={sort} onSort={toggleSort} align="right" />
                    <SortHeader label="Saved" sortKey="estimatedCostSaved" current={sort} onSort={toggleSort} align="right" />
                    <th className="text-xs text-muted-foreground font-normal pb-2 text-right pr-1">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((user) => (
                    <UserRow
                      key={user.userId}
                      user={user}
                      expanded={expandedUser === user.userId}
                      onToggle={() => onToggleExpand(user.userId)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sort Header
// ---------------------------------------------------------------------------

function SortHeader({
  label,
  sortKey,
  current,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: AdoptionSortKey;
  current: { key: AdoptionSortKey; dir: 'asc' | 'desc' };
  onSort: (key: AdoptionSortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = current.key === sortKey;
  return (
    <th
      className={`text-xs font-normal pb-2 cursor-pointer select-none hover:text-foreground transition-colors ${
        align === 'right' ? 'text-right pr-1' : 'text-left pl-1'
      } ${active ? 'text-foreground' : 'text-muted-foreground'}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {active ? (
          <span className="text-[10px]">{current.dir === 'asc' ? '\u25B2' : '\u25BC'}</span>
        ) : (
          <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
        )}
      </span>
    </th>
  );
}

// ---------------------------------------------------------------------------
// User Row (with expandable detail)
// ---------------------------------------------------------------------------

function UserRow({ user, expanded, onToggle }: { user: UserAdoptionStats; expanded: boolean; onToggle: () => void }) {
  const inactive = user.totalAnalyses === 0;

  return (
    <>
      <tr
        className={`border-b border-border/30 cursor-pointer hover:bg-foreground/5 transition-colors ${inactive ? 'opacity-50' : ''}`}
        onClick={onToggle}
      >
        <td className="py-2 pl-1">
          <div className="flex items-center gap-1.5">
            {expanded ? <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
            <span className="text-foreground truncate max-w-[140px]" title={user.email}>
              {user.displayName || user.email.split('@')[0]}
            </span>
          </div>
        </td>
        <td className="py-2 text-right pr-1 text-foreground tabular-nums">{user.totalAnalyses}</td>
        <td className="py-2 text-right pr-1 tabular-nums">
          <span className="text-orange-400">{user.freshAnalyses}</span>
        </td>
        <td className="py-2 text-right pr-1 tabular-nums">
          <span className="text-blue-400">{user.cacheHits}</span>
        </td>
        <td className="py-2 text-right pr-1 tabular-nums">
          {user.totalAnalyses > 0 ? (
            <span className={cacheRateColor(user.cacheHitRate)}>
              {(user.cacheHitRate * 100).toFixed(0)}%
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="py-2 text-right pr-1 text-foreground tabular-nums">{user.uniqueCompanies}</td>
        <td className="py-2 text-right pr-1 text-foreground tabular-nums">{formatCost(user.totalCost)}</td>
        <td className="py-2 text-right pr-1 tabular-nums">
          <span className="text-emerald-500">{formatCost(user.estimatedCostSaved)}</span>
        </td>
        <td className="py-2 text-right pr-1 text-muted-foreground">{relativeTime(user.lastActive)}</td>
      </tr>
      {expanded && (
        <tr className="border-b border-border/30 bg-foreground/[0.02]">
          <td colSpan={9} className="py-3 px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Provider</span>
                <p className="text-foreground capitalize mt-0.5">{user.preferredProvider}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Avg Response</span>
                <p className="text-foreground mt-0.5">
                  {user.avgResponseMs != null ? `${(user.avgResponseMs / 1000).toFixed(1)}s` : '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Member Since</span>
                <p className="text-foreground mt-0.5">
                  {user.firstSeen && user.firstSeen !== '—'
                    ? new Date(user.firstSeen).toLocaleDateString()
                    : '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Full Email</span>
                <p className="text-foreground mt-0.5 truncate" title={user.email}>{user.email}</p>
              </div>
              {user.topCompanies.length > 0 && (
                <div className="col-span-2 md:col-span-4">
                  <span className="text-muted-foreground">Top Companies</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {user.topCompanies.map((co) => (
                      <span key={co} className="px-2 py-0.5 bg-muted/60 border border-border/50 rounded text-foreground text-xs capitalize">
                        {co}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Cost Card
// ---------------------------------------------------------------------------

function CostCard({ title, data }: { title: string; data: UsagePeriod }) {
  return (
    <div className="bg-card/50 border border-border rounded-lg p-3">
      <p className="text-xs text-muted-foreground mb-1">{title}</p>
      <p className="text-lg font-bold text-foreground">{formatCost(data.totalCost)}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground mt-1">
        <span className="flex items-center gap-0.5">
          <TrendingUp className="w-2.5 h-2.5 flex-shrink-0" />
          {data.totalRequests}
        </span>
        <span className="flex items-center gap-0.5">
          <Cpu className="w-2.5 h-2.5 flex-shrink-0" />
          {formatCost(data.aiCost)}
        </span>
        <span className="flex items-center gap-0.5">
          <Search className="w-2.5 h-2.5 flex-shrink-0" />
          {formatCost(data.searchCost)}
        </span>
        <span className="flex items-center gap-0.5">
          <Divide className="w-2.5 h-2.5 flex-shrink-0" />
          {formatCost(data.totalRequests > 0 ? data.totalCost / data.totalRequests : 0)}/search
        </span>
      </div>
    </div>
  );
}
