export interface WebSearchResult {
  title: string;
  url: string;
  description: string;
  content?: string;
  position: number;
  score: number;
  date?: string;
  publishedDate?: string;
}

export interface WebSearchResponse {
  answer?: string;
  organic: WebSearchResult[];
  responseTime: number;
}

export interface WebSearchOptions {
  maxResults?: number;
  includeContent?: boolean;
  includeAnswer?: boolean;
  timeframe?: 'day' | 'week' | 'month' | 'year';
}

const WEB_SEARCH_API_URL = 'https://api.websearchapi.ai/ai-search';

export async function searchWeb(
  query: string,
  apiKey: string,
  options: WebSearchOptions = {}
): Promise<WebSearchResponse> {
  const {
    maxResults = 10,
    includeContent = true,
    includeAnswer = true,
    timeframe = 'month'
  } = options;

  const response = await fetch(WEB_SEARCH_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      query,
      maxResults,
      includeContent,
      contentLength: 'medium',
      contentFormat: 'markdown',
      country: 'us',
      language: 'en',
      timeframe,
      includeAnswer,
      safeSearch: true
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WebSearchAPI error: ${error}`);
  }

  return response.json();
}

const TECH_KEYWORD_PATTERNS: RegExp[] = [
  /\bai\b/, /\btech\b/, /\bapi\b/, /\bllm\b/, /\bsaas\b/,
];
const TECH_KEYWORD_STRINGS = [
  'artificial intelligence', 'machine learning', 'technology', 'fintech',
  'automation', 'cloud computing', 'data analytics', 'digital transformation',
  'cybersecurity', 'software', 'algorithm', 'it infrastructure',
  'generative ai', 'chatbot', 'robo-advis', 'modernization',
  'devops', 'blockchain', 'neural', 'data management', 'compliance tech',
  'platform modernization', 'tech stack', 'deep learning',
];

function hasTechRelevance(title: string, content: string): boolean {
  const text = (title + ' ' + content).toLowerCase();
  if (TECH_KEYWORD_PATTERNS.some(re => re.test(text))) return true;
  return TECH_KEYWORD_STRINGS.some(kw => text.includes(kw));
}

export async function searchCompanyNews(
  companyName: string,
  apiKey: string
): Promise<WebSearchResult[]> {
  const response = await searchWeb(
    `${companyName} technology OR AI OR digital transformation OR fintech OR automation OR cloud OR data analytics OR platform modernization OR cybersecurity OR software`,
    apiKey,
    { maxResults: 15, includeContent: false, includeAnswer: false, timeframe: 'month' }
  );
  // Filter to only include results that actually mention the company
  const companyLower = companyName.toLowerCase();
  const companyWords = companyLower.split(/\s+/).filter(w => w.length > 2);
  // For short names (1-2 words), require at least 1 word; for longer names, require ~50%
  const minMatchCount = Math.max(1, Math.floor(companyWords.length * 0.5));
  return response.organic.filter(r => {
    const text = (r.title + ' ' + r.description).toLowerCase();
    // Must mention the company
    const mentionsCompany = text.includes(companyLower) ||
      companyWords.filter(w => text.includes(w)).length >= minMatchCount;
    if (!mentionsCompany) return false;
    // Must be about technology/AI — reject general company news
    return hasTechRelevance(r.title, r.description || '');
  });
}

export async function searchCompanyCaseStudies(
  companyName: string,
  apiKey: string
): Promise<WebSearchResult[]> {
  const response = await searchWeb(
    `${companyName} case study customer success AWS Microsoft Google Salesforce`,
    apiKey,
    { maxResults: 5, includeContent: false, includeAnswer: false, timeframe: 'year' }
  );
  return response.organic;
}

export async function searchCompanyInfo(
  companyName: string,
  apiKey: string
): Promise<{ answer: string; sources: WebSearchResult[] }> {
  const response = await searchWeb(
    `${companyName} company overview business strategy recent developments`,
    apiKey,
    { maxResults: 5, includeContent: true, includeAnswer: true, timeframe: 'month' }
  );
  return {
    answer: response.answer || '',
    sources: response.organic
  };
}

export async function searchInvestorDocuments(
  companyName: string,
  apiKey: string
): Promise<WebSearchResult[]> {
  const response = await searchWeb(
    `${companyName} investor relations annual report 10-K SEC filing earnings`,
    apiKey,
    { maxResults: 5, includeContent: false, includeAnswer: false, timeframe: 'year' }
  );
  return response.organic;
}

export async function searchInvestorPresentation(
  companyName: string,
  apiKey: string
): Promise<WebSearchResult[]> {
  const currentYear = new Date().getFullYear();
  const response = await searchWeb(
    `"${companyName}" investor presentation OR investor day filetype:pdf OR site:ir OR site:investor ${currentYear} OR ${currentYear - 1}`,
    apiKey,
    { maxResults: 5, includeContent: false, includeAnswer: false, timeframe: 'year' }
  );
  return response.organic;
}
