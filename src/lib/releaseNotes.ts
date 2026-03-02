export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
  changes?: {
    category: 'Added' | 'Fixed' | 'Changed' | 'Removed';
    items: string[];
  }[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '2.0.0',
    date: '2026-03-02',
    highlights: [
      'Google OAuth replaces magic link — one-click sign-in',
      'Theme-aware modals — login, about, and release notes follow your light/dark preference',
      'Refreshed landing page with cleaner, business-focused messaging',
    ],
    changes: [
      {
        category: 'Added',
        items: [
          'Google OAuth sign-in with one-click authentication',
          'Theme-aware styling for login, about, and release notes modals',
          'System theme as default — app follows your OS light/dark preference',
        ],
      },
      {
        category: 'Changed',
        items: [
          'Landing page copy updated to business-focused messaging',
          'Removed API key configuration status from landing page',
          'Footer updated to "AccountSignal — AI-Powered Corporate Intelligence"',
        ],
      },
      {
        category: 'Removed',
        items: [
          'Magic link (email OTP) authentication — replaced by Google OAuth',
        ],
      },
      {
        category: 'Fixed',
        items: [
          'Light mode text visibility in guest banner and landing page',
          'Duplicate sign-in button removed from guest banner',
          'Google sign-in button text color on dark backgrounds',
        ],
      },
    ],
  },
  {
    version: '1.5.1',
    date: '2026-02-27',
    highlights: [
      'AI & Technology News now reliably returns results for all companies',
      'Cache expiry implemented — stale analyses auto-refresh after 24 hours',
      'Security hardening with rate limiting and CSP headers',
    ],
    changes: [
      {
        category: 'Fixed',
        items: [
          'AI & Technology News returning empty for companies like LPL Financial — broadened search queries, relaxed company name matching, and switched Tavily to general topic for wider coverage',
          'Cache never expired — CACHE_EXPIRY_MINUTES was defined but never checked, causing stale empty results to be served indefinitely',
          'Tech news aggressively wiped to empty when web search filter returned 0 results — now preserves AI-generated fallback content',
          'Short/abbreviated company names returning no results due to quoted search queries',
          'About modal scroll overflow on smaller screens',
        ],
      },
      {
        category: 'Added',
        items: [
          'Tech-relevance filter to prune non-technology articles from news results (regex word boundaries for short keywords like AI, cloud, digital)',
          'Expanded tech keyword coverage for financial services: fintech, wealthtech, regtech, innovation, cloud migration, open banking, and more',
          'Rate limiting, Content Security Policy headers, and RLS policy fixes',
          'Regulatory event deduplication improvements with sources capped at 3',
        ],
      },
      {
        category: 'Changed',
        items: [
          'Tavily search topic changed from news-only to general for broader coverage (press releases, company blogs, etc.)',
          'Tech news max results increased from 10 to 20 for wider search coverage',
          'Removed debug logging from production code',
        ],
      },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-02-26',
    highlights: [
      'Production deployment with new infrastructure',
      'Regulatory landscape now reliably populated for all companies',
      'Claude Sonnet 4.6 as default Anthropic model',
      'Tavily search optimizations and fixes',
    ],
    changes: [
      {
        category: 'Added',
        items: [
          'Claude Sonnet 4.6 added as default Anthropic model with pricing',
          'Regulatory landscape fallback — enriches AI results with regulatory bodies found in enforcement events',
          'Official regulator homepage URLs for 25+ bodies (SEC, FINRA, FCA, etc.)',
          'Meaningful descriptions for all known regulatory bodies',
          'Full Supabase migration script (001_full_schema.sql) with all tables, RLS policies, and triggers',
        ],
      },
      {
        category: 'Fixed',
        items: [
          'Regulatory landscape no longer returns empty — improved AI prompt and enrichment fallback',
          'Investor presentations restored for Tavily search path (was hardcoded to empty)',
          'Self-referencing RLS policy on profiles table causing 500 errors',
          'Verify-key endpoint updated from deprecated claude-3-5-haiku to current model',
        ],
      },
      {
        category: 'Changed',
        items: [
          'Regulatory landscape URLs now point to regulator homepages instead of news articles',
          'AI prompt rewritten to use model knowledge for regulatory bodies instead of asking it to browse pages',
          'Tavily investor docs results now filtered to identify presentations by keyword matching',
          'Removed "Searching for mentions by:" implementation detail from competitor mentions UI',
        ],
      },
    ],
  },
  {
    version: '1.4.2',
    date: '2026-02-10',
    highlights: [
      'Company search disambiguation with Yahoo Finance fallback',
      'Unknown companies now surface real results instead of just "Search for this company"',
    ],
    changes: [
      {
        category: 'Added',
        items: [
          'Yahoo Finance search fallback when hardcoded list has weak or few matches',
          'Source labels and section dividers in search dropdown (known vs Yahoo Finance)',
          'Support for non-EQUITY quote types to surface private companies from Yahoo Finance',
        ],
      },
      {
        category: 'Changed',
        items: [
          'Search results now capped at 8 (hardcoded + Yahoo combined) for cleaner dropdown',
          'Results tagged with source field (known/yahoo/custom) for UI grouping',
        ],
      },
    ],
  },
  {
    version: '1.4.1',
    date: '2026-02-10',
    highlights: [
      'Fixed competitor mentions hallucination leak',
      'Broadened search to any source mentioning company + vendor together',
    ],
    changes: [
      {
        category: 'Fixed',
        items: [
          'Removed AI-generated competitor mentions from prompt — was producing hallucinated URLs',
          'Competitor mentions now cleared before extraction, so only verified results appear',
        ],
      },
      {
        category: 'Changed',
        items: [
          'Search now finds mentions from any source (vendor, company, news), not just vendor-published content',
          'Added third search query for announcement-style coverage',
        ],
      },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-02-09',
    highlights: [
      'Redesigned competitor mentions — zero hallucinated URLs',
      'AI discovers additional compliance vendors dynamically',
      'API calls reduced from 24+ to ~4-5',
    ],
    changes: [
      {
        category: 'Added',
        items: [
          'AI-powered extraction — constrained to real search result URLs only',
          'AI discovers additional compliance/archiving vendors beyond the hardcoded list',
          'Consolidated search: 2-3 broad queries replace 24 narrow ones',
        ],
      },
      {
        category: 'Changed',
        items: [
          'Competitor mentions now show full list of compliance vendors searched',
          'UI no longer shows "Unverified" badges (all results verified by design)',
        ],
      },
      {
        category: 'Removed',
        items: [
          'Deprecated heuristic anti-hallucination system for competitor mentions',
          'Removed hardcoded compliance-industry competitor list from search providers',
        ],
      },
    ],
  },
  {
    version: '1.3.1',
    date: '2026-02-09',
    highlights: [
      'Rebranded to Theta Lake AccountSignal',
      'Admin role toggle and usage tracking improvements',
    ],
    changes: [
      {
        category: 'Changed',
        items: [
          'Rebranded from MarketPulse to Theta Lake AccountSignal',
          'Theme-aware styling for Usage & Costs window',
        ],
      },
      {
        category: 'Fixed',
        items: [
          'Settings modal light mode text visibility',
          'Avg cost per search visibility',
          'Role update error handling',
        ],
      },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-02-08',
    highlights: [
      'Regulatory events with multi-source deduplication',
      'Leadership changes from web search',
      'Investor presentation discovery',
    ],
    changes: [
      {
        category: 'Added',
        items: [
          'Regulatory events search with SEC, FINRA, DOJ, FCA sources',
          'Leadership changes parsing from news articles',
          'Investor presentation search and featured display',
          'Usage & Costs floating panel',
          'Admin user management',
        ],
      },
      {
        category: 'Changed',
        items: [
          'Regulatory events deduplicated across multiple sources',
          'Improved investor documents section with presentation as featured item',
        ],
      },
    ],
  },
  {
    version: '1.2.2',
    date: '2026-02-05',
    highlights: [
      'Anti-hallucination system for competitor mentions',
      'Re-enabled competitor mentions with improved reliability',
    ],
    changes: [
      {
        category: 'Added',
        items: [
          'Multi-layer heuristic scoring system to filter hallucinated results',
          'URL quality scoring (rejects generic listing pages)',
          'Content quality scoring (detects marketing fluff vs. grounded facts)',
          '"Unverified" badge for medium-confidence results',
        ],
      },
      {
        category: 'Changed',
        items: [
          'Search queries now target press releases and news sources',
          'Competitor mentions now show confidence-based filtering',
        ],
      },
      {
        category: 'Fixed',
        items: [
          'Reduced hallucinated/fabricated competitor mention URLs',
          'Improved filtering for generic listing pages (/customers/, /case-studies/)',
        ],
      },
    ],
  },
  {
    version: '1.2.1',
    date: '2026-02-05',
    highlights: [
      'Competitor mentions temporarily disabled',
      'Improved data reliability',
    ],
    changes: [
      {
        category: 'Changed',
        items: [
          'Competitor mentions temporarily disabled due to unreliable search API results',
          'Build number now updates correctly with each deployment',
        ],
      },
      {
        category: 'Fixed',
        items: [
          'Eliminated hallucinated/fabricated competitor mention data',
          'Improved overall data quality by removing unreliable sources',
        ],
      },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-02-05',
    highlights: [
      'PDF export functionality',
      'Enhanced Claude Search with regulatory events',
      'Improved UI for regulatory landscape',
    ],
    changes: [
      {
        category: 'Added',
        items: [
          'PDF export using browser\'s native print-to-PDF',
          'Regulatory events search for Claude Search provider',
          'Competitor mentions search for Claude Search provider',
          'Release notes viewer in About modal',
        ],
      },
      {
        category: 'Fixed',
        items: [
          'Build info now displays correctly in About modal (was showing "unknown")',
          'Claude Web Search selection now saves properly in settings',
          'Model display bug - was showing gpt-4o when using Anthropic Claude',
          'Status messages now show correct model and search engine during analysis',
        ],
      },
      {
        category: 'Changed',
        items: [
          'Regulatory body labels shortened to acronyms (e.g., ESMA instead of full name)',
          'Competitor mentions filtering improved to focus on business relationships',
        ],
      },
    ],
  },
  {
    version: '1.1.5',
    date: '2025-02-04',
    highlights: [
      'Usage tracking and analytics',
      'Claude model updates',
    ],
    changes: [
      {
        category: 'Added',
        items: [
          'Usage tracking feature for monitoring API calls',
          'Claude Web Search option using Brave Search',
        ],
      },
      {
        category: 'Changed',
        items: [
          'Updated Claude models to latest versions',
        ],
      },
    ],
  },
  {
    version: '1.1.0',
    date: '2025-01-30',
    highlights: [
      'Multi-provider AI support',
      'Shared caching system',
      'User authentication',
    ],
    changes: [
      {
        category: 'Added',
        items: [
          'Support for OpenAI, Anthropic, Google Gemini, and Perplexity',
          'Shared analysis cache across users',
          'Supabase authentication integration',
          'Bookmarks and history functionality',
          'Settings persistence per user',
        ],
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2025-01-25',
    highlights: [
      'Initial release',
      'AI-powered company analysis',
      'Real-time stock data',
    ],
    changes: [
      {
        category: 'Added',
        items: [
          'Company search with autocomplete',
          'AI-generated executive summaries',
          'Real-time stock data and charts',
          'Key priorities and growth initiatives',
          'M&A activity tracking',
          'Leadership changes monitoring',
          'Regulatory landscape overview',
          'Tech news and case studies',
          'Investor documents discovery',
        ],
      },
    ],
  },
];
