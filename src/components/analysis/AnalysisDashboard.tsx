'use client';

import { AnalysisResult, ProviderName } from '@/types/analysis';
import { CompanyInfo } from '@/components/layout/Header';
import { SentimentBadge } from './sections/SentimentBadge';
import { ExecutiveSummary } from './sections/ExecutiveSummary';
import { QuickFacts } from './sections/QuickFacts';
import { KeyPriorities } from './sections/KeyPriorities';
import { GrowthInitiatives } from './sections/GrowthInitiatives';
import { InvestorDocuments } from './sections/InvestorDocuments';
import { TechNews } from './sections/TechNews';
import { CaseStudies } from './sections/CaseStudies';
import { CompetitiveLandscape } from './sections/CompetitiveLandscape';
import { CompetitorMentions } from './sections/CompetitorMentions';
import { LeadershipChanges } from './sections/LeadershipChanges';
import { MAActivity } from './sections/MAActivity';
import { GroundingSources } from './sections/GroundingSources';
import { StockCard } from '../stock/StockCard';
import { Bookmark, BookmarkCheck, Globe, AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnalysisDashboardProps {
  companyName: string;
  companyInfo?: CompanyInfo | null;
  data: AnalysisResult;
  ticker?: string;
  provider: ProviderName;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  webSearchUsed?: boolean;
  webSearchError?: string | null;
  // Cached data props
  cachedDataTimestamp?: number | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

// Helper function to format relative time
function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

// Check if data is stale (older than 24 hours)
function isDataStale(timestamp: number): boolean {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  return Date.now() - timestamp > ONE_DAY;
}

export function AnalysisDashboard({
  companyName,
  companyInfo,
  data,
  ticker,
  provider,
  isBookmarked,
  onToggleBookmark,
  webSearchUsed,
  webSearchError,
  cachedDataTimestamp,
  onRefresh,
  isRefreshing
}: AnalysisDashboardProps) {
  const isCached = cachedDataTimestamp !== null && cachedDataTimestamp !== undefined;
  const isStale = isCached && isDataStale(cachedDataTimestamp);
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Company Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Company Name + Sentiment */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">{companyName}</h2>
          <SentimentBadge sentiment={data.sentiment} />
        </div>

        {/* Status Badges + Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          {/* Status badges */}
          <div className="flex flex-wrap items-center gap-2">
            {webSearchUsed && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-xs font-medium">
                <Globe className="w-3 h-3" />
                <span className="hidden xs:inline">Web Search</span>
              </div>
            )}
            {webSearchError && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-medium" title={webSearchError}>
                <AlertTriangle className="w-3 h-3" />
                <span className="hidden xs:inline">Search Failed</span>
              </div>
            )}
            {isCached && (
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                isStale
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                  : 'bg-zinc-500/10 border border-zinc-500/30 text-zinc-400'
              }`}>
                <Database className="w-3 h-3" />
                <span className="hidden sm:inline">Cached {getRelativeTime(cachedDataTimestamp!)}</span>
                <span className="sm:hidden">{getRelativeTime(cachedDataTimestamp!)}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isCached && onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className={`border-zinc-700 transition-colors h-8 px-2 sm:px-3 ${
                  isStale
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline ml-2">{isStale ? 'Refresh' : 'Refresh'}</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleBookmark}
              className={`border-zinc-700 transition-colors h-8 px-2 sm:px-3 ${
                isBookmarked
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {isBookmarked ? (
                <>
                  <BookmarkCheck className="w-4 h-4" />
                  <span className="hidden sm:inline ml-2">Saved</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  <span className="hidden sm:inline ml-2">Save</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Stale Data Warning Banner */}
      {isStale && onRefresh && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <h4 className="text-amber-400 font-medium text-sm">Data may be outdated</h4>
              <p className="text-amber-400/70 text-xs mt-0.5">
                Saved {getRelativeTime(cachedDataTimestamp!)}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="bg-amber-600 hover:bg-amber-500 text-white w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Now
          </Button>
        </div>
      )}

      {/* Web Search Error Banner */}
      {webSearchError && (
        <div className="flex items-start gap-3 p-3 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-amber-400 font-medium text-sm">Web Search Unavailable</h4>
            <p className="text-amber-400/70 text-xs mt-1">{webSearchError}</p>
            <p className="text-zinc-500 text-xs mt-2 hidden sm:block">
              Links in news, case studies, and investor documents may not work.
              Check your WebSearchAPI key in settings, or switch to Gemini/Perplexity for built-in web grounding.
            </p>
          </div>
        </div>
      )}

      {/* Dashboard Grid - Reorganized for better space efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Row 1: Company Overview */}
        <StockCard ticker={ticker} companyName={companyName} companyInfo={companyInfo} />
        <QuickFacts facts={data.quickFacts} />

        {/* Row 2: Executive Summary - Full Width */}
        <ExecutiveSummary summary={data.summary} />

        {/* Row 3: Strategic Direction */}
        <KeyPriorities priorities={data.keyPriorities} />
        <GrowthInitiatives initiatives={data.growthInitiatives} />
        <MAActivity activity={data.maActivity} />

        {/* Row 4: News & Intelligence */}
        <TechNews news={data.techNews} />
        <LeadershipChanges changes={data.leadershipChanges || []} />

        {/* Row 5: Competitive Intelligence - Even split */}
        <div className="lg:col-span-2 xl:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CompetitiveLandscape competitors={data.competitors} />
          <CompetitorMentions mentions={data.competitorMentions || []} />
        </div>

        {/* Row 6: Documents & Resources */}
        <InvestorDocuments documents={data.investorDocs} companyInfo={companyInfo} />
        <CaseStudies studies={data.caseStudies} />
      </div>

      {/* Grounding Sources */}
      <GroundingSources sources={data.sources} />
    </div>
  );
}
