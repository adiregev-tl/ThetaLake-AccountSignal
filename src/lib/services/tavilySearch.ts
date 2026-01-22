export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilySearchResponse {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
  response_time: number;
}

const TAVILY_API_URL = 'https://api.tavily.com/search';

export async function tavilySearch(
  query: string,
  apiKey: string,
  options: {
    searchDepth?: 'basic' | 'advanced';
    maxResults?: number;
    includeAnswer?: boolean;
    includeRawContent?: boolean;
  } = {}
): Promise<TavilySearchResponse> {
  const {
    searchDepth = 'basic',
    maxResults = 10,
    includeAnswer = true,
    includeRawContent = false
  } = options;

  const response = await fetch(TAVILY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: searchDepth,
      max_results: maxResults,
      include_answer: includeAnswer,
      include_raw_content: includeRawContent
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tavily API error: ${error}`);
  }

  return response.json();
}

export async function tavilySearchCompanyNews(
  companyName: string,
  apiKey: string
): Promise<TavilySearchResult[]> {
  const response = await tavilySearch(
    `${companyName} latest news technology AI developments`,
    apiKey,
    { maxResults: 10, includeAnswer: false }
  );
  return response.results;
}

export async function tavilySearchCaseStudies(
  companyName: string,
  apiKey: string
): Promise<TavilySearchResult[]> {
  const response = await tavilySearch(
    `${companyName} case study customer success story`,
    apiKey,
    { maxResults: 5, includeAnswer: false }
  );
  return response.results;
}

export async function tavilySearchCompanyInfo(
  companyName: string,
  apiKey: string
): Promise<{ answer: string; sources: TavilySearchResult[] }> {
  const response = await tavilySearch(
    `${companyName} company overview business strategy recent developments`,
    apiKey,
    { maxResults: 5, includeAnswer: true, searchDepth: 'advanced' }
  );
  return {
    answer: response.answer || '',
    sources: response.results
  };
}

export async function tavilySearchInvestorDocs(
  companyName: string,
  apiKey: string
): Promise<TavilySearchResult[]> {
  const response = await tavilySearch(
    `${companyName} investor relations SEC filing annual report 10-K`,
    apiKey,
    { maxResults: 5, includeAnswer: false }
  );
  return response.results;
}

// Competitor companies to search for mentions
const COMPETITOR_DOMAINS = [
  'thetalake.com',
  'smarsh.com',
  'globalrelay.com',
  'nice.com',
  'verint.com',
  'arctera.io',
  'veritas.com',
  'proofpoint.com',
  'shieldfc.com',
  'behavox.com',
  'digitalreasoning.com',
  'mimecast.com',
  'zlti.com'
];

const COMPETITOR_NAMES: Record<string, string> = {
  'thetalake.com': 'Theta Lake',
  'smarsh.com': 'Smarsh',
  'globalrelay.com': 'Global Relay',
  'nice.com': 'NICE',
  'verint.com': 'Verint',
  'arctera.io': 'Arctera',
  'veritas.com': 'Veritas',
  'proofpoint.com': 'Proofpoint',
  'shieldfc.com': 'Shield',
  'behavox.com': 'Behavox',
  'digitalreasoning.com': 'Digital Reasoning',
  'mimecast.com': 'Mimecast',
  'zlti.com': 'ZL Technologies'
};

export interface CompetitorMention {
  competitorName: string;
  title: string;
  url: string;
  summary: string;
  mentionType: 'customer' | 'partner' | 'case_study' | 'press_release' | 'other';
}

function inferMentionType(url: string, content: string): CompetitorMention['mentionType'] {
  const urlLower = url.toLowerCase();
  const contentLower = content.toLowerCase();

  if (urlLower.includes('case-study') || urlLower.includes('casestudy') || urlLower.includes('customer-story') || contentLower.includes('case study')) {
    return 'case_study';
  }
  if (urlLower.includes('customer') || urlLower.includes('client') || contentLower.includes('customer')) {
    return 'customer';
  }
  if (urlLower.includes('partner') || contentLower.includes('partner')) {
    return 'partner';
  }
  if (urlLower.includes('press') || urlLower.includes('news') || urlLower.includes('blog')) {
    return 'press_release';
  }
  return 'other';
}

export async function tavilySearchCompetitorMentions(
  companyName: string,
  apiKey: string
): Promise<CompetitorMention[]> {
  const mentions: CompetitorMention[] = [];

  // Search for the company across all competitor domains in parallel
  // Use specific search terms to find relevant announcements, not generic pages
  const searchPromises = COMPETITOR_DOMAINS.map(async (domain) => {
    try {
      // Search for specific types of content: customer wins, partnerships, case studies, press releases
      const response = await tavilySearch(
        `"${companyName}" site:${domain} (customer OR partner OR case study OR announcement OR press release OR deploys OR selects OR chooses)`,
        apiKey,
        { maxResults: 3, includeAnswer: false, searchDepth: 'advanced' }
      );

      // Filter results to only include pages that actually mention the company name in title or content
      const relevantResults = response.results.filter(result => {
        const titleLower = result.title.toLowerCase();
        const contentLower = result.content.toLowerCase();
        const companyLower = companyName.toLowerCase();

        // Must mention the company name in title or prominently in content
        const mentionsCompany = titleLower.includes(companyLower) ||
          contentLower.includes(companyLower);

        // Exclude generic pages like careers, about, contact, pricing
        const isGenericPage = result.url.toLowerCase().match(/(career|job|about-us|contact|pricing|demo|login|signup|privacy|terms)/);

        return mentionsCompany && !isGenericPage;
      });

      return relevantResults.map(result => ({
        competitorName: COMPETITOR_NAMES[domain] || domain,
        title: result.title,
        url: result.url,
        summary: result.content.substring(0, 200),
        mentionType: inferMentionType(result.url, result.content)
      }));
    } catch (err) {
      // Silently fail for individual competitor searches
      console.warn(`Failed to search ${domain} for ${companyName}:`, err);
      return [];
    }
  });

  const results = await Promise.all(searchPromises);
  results.forEach(competitorResults => {
    mentions.push(...competitorResults);
  });

  return mentions;
}

export async function tavilySearchLeadershipChanges(
  companyName: string,
  apiKey: string
): Promise<TavilySearchResult[]> {
  const response = await tavilySearch(
    `"${companyName}" (appoints OR appointed OR names OR named OR promotes OR promoted OR hires OR hired OR joins) (CEO OR CFO OR CTO OR COO OR CMO OR "Chief" OR President OR "Vice President" OR Director OR Executive)`,
    apiKey,
    { maxResults: 10, includeAnswer: false, searchDepth: 'advanced' }
  );

  // Filter results to only include actual news/press releases about leadership
  return response.results.filter(result => {
    const urlLower = result.url.toLowerCase();
    const titleLower = result.title.toLowerCase();

    // Must be a news/press release type page
    const isRelevantPage = urlLower.includes('news') ||
      urlLower.includes('press') ||
      urlLower.includes('announce') ||
      urlLower.includes('blog') ||
      urlLower.includes('businesswire') ||
      urlLower.includes('prnewswire') ||
      urlLower.includes('globenewswire') ||
      titleLower.includes('appoint') ||
      titleLower.includes('name') ||
      titleLower.includes('hire') ||
      titleLower.includes('join') ||
      titleLower.includes('promote');

    // Exclude job postings and career pages
    const isJobPage = urlLower.includes('career') ||
      urlLower.includes('job') ||
      urlLower.includes('linkedin.com/jobs') ||
      urlLower.includes('indeed.com') ||
      urlLower.includes('glassdoor');

    return isRelevantPage && !isJobPage;
  });
}
