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
    version: '1.4.0',
    date: '2026-02-09',
    highlights: [
      'Redesigned competitor mentions — zero hallucinated URLs',
      'Dynamic competitor discovery for any company',
      'API calls reduced from 24+ to ~4-5',
    ],
    changes: [
      {
        category: 'Added',
        items: [
          'AI-powered competitor extraction — constrained to real search result URLs only',
          'Dynamic competitor discovery via AI analysis (works for any industry)',
          'Consolidated search: 2-3 broad queries replace 24 narrow ones',
        ],
      },
      {
        category: 'Changed',
        items: [
          'Competitor mentions now show which competitors were analyzed',
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
