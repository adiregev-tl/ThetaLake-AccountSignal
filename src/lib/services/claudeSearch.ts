import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeSearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface ClaudeSearchResponse {
  query: string;
  answer?: string;
  results: ClaudeSearchResult[];
}

/**
 * Perform a web search using Claude's built-in web search tool
 * Powered by Brave Search
 */
export async function claudeSearch(
  query: string,
  apiKey: string,
  options: {
    maxResults?: number;
    includeAnswer?: boolean;
  } = {}
): Promise<ClaudeSearchResponse> {
  const { maxResults = 10, includeAnswer = true } = options;

  const client = new Anthropic({ apiKey });

  const systemPrompt = includeAnswer
    ? `You are a research assistant. Search the web for the query and provide:
1. A brief, factual answer summarizing the key findings
2. Extract the most relevant search results

Format your response as JSON:
{
  "answer": "Your summary here",
  "results": [
    {"title": "...", "url": "...", "content": "snippet of relevant content..."}
  ]
}

Return up to ${maxResults} most relevant results. Only include results directly relevant to the query.`
    : `You are a research assistant. Search the web for the query and extract the most relevant search results.

Format your response as JSON:
{
  "results": [
    {"title": "...", "url": "...", "content": "snippet of relevant content..."}
  ]
}

Return up to ${maxResults} most relevant results. Only include results directly relevant to the query.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    tools: [
      {
        type: 'web_search_20250305' as const,
        name: 'web_search',
        max_uses: 3,
      },
    ] as unknown as Anthropic.Tool[],
    messages: [
      {
        role: 'user',
        content: `Search for: ${query}`,
      },
    ],
    system: systemPrompt,
  });

  // Extract citations and text from the response
  const results: ClaudeSearchResult[] = [];
  let answer = '';

  for (const block of response.content) {
    if (block.type === 'text') {
      // Try to parse JSON response
      try {
        const jsonMatch = block.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.answer) {
            answer = parsed.answer;
          }
          if (parsed.results && Array.isArray(parsed.results)) {
            for (const r of parsed.results) {
              if (r.title && r.url) {
                results.push({
                  title: r.title,
                  url: r.url,
                  content: r.content || '',
                  score: 1.0,
                });
              }
            }
          }
        }
      } catch {
        // If JSON parsing fails, use the text as the answer
        answer = block.text;
      }
    }
  }

  // Also extract citations if available
  if ('citations' in response && Array.isArray(response.citations)) {
    for (const citation of response.citations as Array<{ url?: string; title?: string; cited_text?: string }>) {
      if (citation.url && !results.find(r => r.url === citation.url)) {
        results.push({
          title: citation.title || '',
          url: citation.url,
          content: citation.cited_text || '',
          score: 0.9,
        });
      }
    }
  }

  return {
    query,
    answer: answer || undefined,
    results: results.slice(0, maxResults),
  };
}

export async function claudeSearchCompanyNews(
  companyName: string,
  apiKey: string
): Promise<ClaudeSearchResult[]> {
  const response = await claudeSearch(
    `${companyName} latest news technology AI developments`,
    apiKey,
    { maxResults: 10, includeAnswer: false }
  );
  return response.results;
}

export async function claudeSearchCaseStudies(
  companyName: string,
  apiKey: string
): Promise<ClaudeSearchResult[]> {
  const response = await claudeSearch(
    `${companyName} case study customer success story`,
    apiKey,
    { maxResults: 5, includeAnswer: false }
  );
  return response.results;
}

export async function claudeSearchCompanyInfo(
  companyName: string,
  apiKey: string
): Promise<{ answer: string; sources: ClaudeSearchResult[] }> {
  const response = await claudeSearch(
    `${companyName} company overview business strategy recent developments`,
    apiKey,
    { maxResults: 5, includeAnswer: true }
  );
  return {
    answer: response.answer || '',
    sources: response.results,
  };
}

export async function claudeSearchInvestorDocs(
  companyName: string,
  apiKey: string
): Promise<ClaudeSearchResult[]> {
  const response = await claudeSearch(
    `${companyName} investor relations SEC filing annual report 10-K`,
    apiKey,
    { maxResults: 5, includeAnswer: false }
  );
  return response.results;
}

export async function claudeSearchLeadershipChanges(
  companyName: string,
  apiKey: string
): Promise<ClaudeSearchResult[]> {
  const currentYear = new Date().getFullYear();
  const response = await claudeSearch(
    `"${companyName}" executive leadership appointments CEO CFO CTO ${currentYear - 2}..${currentYear}`,
    apiKey,
    { maxResults: 10, includeAnswer: false }
  );
  return response.results;
}

export interface ClaudeRegulatoryEvent {
  date: string;
  regulatoryBody: string;
  eventType: 'fine' | 'penalty' | 'settlement' | 'enforcement' | 'investigation' | 'consent' | 'order' | 'action' | 'other';
  amount?: string;
  description: string;
  url: string;
}

export async function claudeSearchRegulatoryEvents(
  companyName: string,
  apiKey: string
): Promise<ClaudeRegulatoryEvent[]> {
  const client = new Anthropic({ apiKey });

  const systemPrompt = `You are a regulatory compliance researcher. Search for SEC, FINRA, DOJ, FCA, and other regulatory enforcement actions, fines, penalties, and settlements involving the specified company.

For each regulatory event found, extract:
- date: The date or year of the event
- regulatoryBody: The regulatory body (SEC, FINRA, DOJ, FCA, CFTC, OCC, FDIC, etc.)
- eventType: One of: fine, penalty, settlement, enforcement, investigation, consent, order, action, other
- amount: The fine/penalty amount if mentioned (e.g., "$15 million")
- description: Brief description of the violation or event
- url: The source URL

Return as JSON array:
{
  "events": [
    {"date": "2023", "regulatoryBody": "SEC", "eventType": "settlement", "amount": "$100 million", "description": "...", "url": "..."}
  ]
}

Only include REAL, verified regulatory events with actual source URLs. Do not fabricate events.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    tools: [
      {
        type: 'web_search_20250305' as const,
        name: 'web_search',
        max_uses: 5,
      },
    ] as unknown as Anthropic.Tool[],
    messages: [
      {
        role: 'user',
        content: `Search for regulatory enforcement actions, fines, penalties, and settlements involving "${companyName}" from SEC, FINRA, DOJ, FCA, and other regulators in the past 5 years.`,
      },
    ],
    system: systemPrompt,
  });

  const events: ClaudeRegulatoryEvent[] = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      try {
        const jsonMatch = block.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.events && Array.isArray(parsed.events)) {
            for (const e of parsed.events) {
              if (e.regulatoryBody && e.description && e.url) {
                events.push({
                  date: e.date || 'Recent',
                  regulatoryBody: e.regulatoryBody,
                  eventType: e.eventType || 'other',
                  amount: e.amount,
                  description: e.description,
                  url: e.url,
                });
              }
            }
          }
        }
      } catch {
        // JSON parsing failed, skip
      }
    }
  }

  return events.slice(0, 10);
}

export interface ClaudeCompetitorMention {
  competitorName: string;
  title: string;
  url: string;
  summary: string;
  mentionType: 'customer' | 'partner' | 'case_study' | 'press_release' | 'integration' | 'other';
}

export async function claudeSearchCompetitorMentions(
  companyName: string,
  apiKey: string
): Promise<ClaudeCompetitorMention[]> {
  const competitors = ['Smarsh', 'Global Relay', 'NICE', 'Verint', 'Arctera', 'Veritas', 'Proofpoint', 'Shield', 'Behavox', 'Mimecast', 'ZL Technologies'];

  const client = new Anthropic({ apiKey });

  const systemPrompt = `You are a competitive intelligence researcher. Search for technology-related mentions of the specified company on competitor websites.

Look for: customer case studies, technology partnerships, product integrations, competitive comparisons, press releases.

For each mention found, extract:
- competitorName: The competitor company name
- title: The page/article title
- url: The source URL
- summary: Brief summary of the technology relevance
- mentionType: One of: customer, partner, case_study, press_release, integration, other

Return as JSON:
{
  "mentions": [
    {"competitorName": "...", "title": "...", "url": "...", "summary": "...", "mentionType": "..."}
  ]
}

Only include REAL mentions with actual URLs from competitor websites. Focus on technology-related content, not financial advisory roles.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    tools: [
      {
        type: 'web_search_20250305' as const,
        name: 'web_search',
        max_uses: 5,
      },
    ] as unknown as Anthropic.Tool[],
    messages: [
      {
        role: 'user',
        content: `Search for technology-related mentions of "${companyName}" on these competitor websites: ${competitors.join(', ')}. Look for customer stories, integrations, partnerships, and case studies.`,
      },
    ],
    system: systemPrompt,
  });

  const mentions: ClaudeCompetitorMention[] = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      try {
        const jsonMatch = block.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.mentions && Array.isArray(parsed.mentions)) {
            for (const m of parsed.mentions) {
              if (m.competitorName && m.url && m.title) {
                mentions.push({
                  competitorName: m.competitorName,
                  title: m.title,
                  url: m.url,
                  summary: m.summary || '',
                  mentionType: m.mentionType || 'other',
                });
              }
            }
          }
        }
      } catch {
        // JSON parsing failed, skip
      }
    }
  }

  return mentions;
}
