/**
 * Anti-Hallucination Module
 *
 * Provides heuristic-based scoring to filter out fabricated/hallucinated
 * search results without relying on network validation (which fails on Vercel).
 */

export interface SearchResultInput {
  title: string;
  url: string;
  content: string;
  score?: number; // Tavily's relevance score (0-1)
}

export interface ScoredResult extends SearchResultInput {
  confidence: number;
  unverified: boolean;
  rejectionReason?: string;
}

// Patterns that indicate generic listing pages (immediate rejection)
const REJECT_URL_PATTERNS = [
  /\/customers?\/?$/i,
  /\/case-stud(y|ies)\/?$/i,
  /\/partners?\/?$/i,
  /\/resources?\/?$/i,
  /\/integrations?\/?$/i,
  /\/solutions?\/?$/i,
  /\/testimonials?\/?$/i,
  /\/(news|blog|press)\/?$/i,
  /\/industries?\/?$/i,
  /\/success-stories?\/?$/i,
  /\/us\/resources\/case-studies\/?$/i,
];

// Trusted news/press release domains
const TRUSTED_NEWS_DOMAINS = [
  'reuters.com',
  'businesswire.com',
  'prnewswire.com',
  'globenewswire.com',
  'bloomberg.com',
  'wsj.com',
  'ft.com',
  'cnbc.com',
  'marketwatch.com',
  'sec.gov',
  'finra.org',
];

// Phrases that indicate hallucinated/marketing content
const HALLUCINATION_PHRASES = [
  'leading provider of',
  'leading provider in',
  'trusted by',
  'helps organizations',
  'enables companies',
  'comprehensive solution',
  'industry-leading',
  'best-in-class',
  'world-class',
  'cutting-edge',
  'state-of-the-art',
  'innovative solution',
  'enterprise-grade',
  'mission-critical',
  'next-generation',
  'seamless integration',
  'end-to-end',
  'robust platform',
  'scalable solution',
];

// Patterns that indicate grounded, specific content
const GROUNDING_PATTERNS = {
  specificDate: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}?,?\s*20\d{2}/i,
  yearOnly: /\b20(2[0-6]|1\d)\b/,
  dollarAmount: /\$[\d,]+(\.\d+)?\s*(million|billion|m|b|k)?/i,
  directQuote: /"[^"]{15,}"/,
  executiveAttribution: /\b(CEO|CFO|CTO|COO|CIO|CISO|President|Vice President|VP|Director|Manager)\b[^.]*\b(said|stated|announced|commented|noted|explained)/i,
  percentageMetric: /\d+(\.\d+)?%/,
  specificNumber: /\b\d{2,}\s+(customers?|clients?|employees?|users?|companies|organizations)/i,
};

/**
 * Calculate URL quality score
 * Returns -50 to +50
 */
function calculateUrlScore(url: string, companyName?: string): { score: number; reason?: string } {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const path = urlObj.pathname.toLowerCase();
    const pathParts = path.split('/').filter(p => p.length > 0);

    // Immediate rejection for generic listing pages
    for (const pattern of REJECT_URL_PATTERNS) {
      if (pattern.test(path)) {
        return { score: -50, reason: `Generic listing page: ${path}` };
      }
    }

    // Very short paths are likely index pages
    if (pathParts.length <= 1) {
      return { score: -30, reason: 'URL path too short (likely index page)' };
    }

    let score = 0;

    // Trusted news source bonus
    for (const domain of TRUSTED_NEWS_DOMAINS) {
      if (hostname.includes(domain)) {
        score += 25;
        break;
      }
    }

    // PDF/document bonus
    if (path.endsWith('.pdf') || path.includes('/documents/') || path.includes('/filings/')) {
      score += 15;
    }

    // Year in URL suggests dated content (more likely real)
    if (/20(2[0-6]|1\d)/.test(path)) {
      score += 10;
    }

    // 3+ path segments with specific content suggests specific article
    if (pathParts.length >= 3) {
      const hasSpecificSlug = pathParts.some(p => p.length > 15);
      if (hasSpecificSlug) {
        score += 20;
      } else {
        score += 10;
      }
    }

    // Company name in URL path (slugified)
    if (companyName) {
      const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const shortSlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '');
      if (path.includes(slug) || path.includes(shortSlug)) {
        score += 15;
      }
    }

    // Penalize if URL looks like a template/generic page
    if (path.includes('/category/') || path.includes('/tag/') || path.includes('/page/')) {
      score -= 15;
    }

    return { score: Math.max(-50, Math.min(50, score)) };
  } catch {
    return { score: -50, reason: 'Invalid URL' };
  }
}

/**
 * Calculate content quality score
 * Returns -50 to +50
 */
function calculateContentScore(content: string, title: string, companyName: string, competitorName?: string): { score: number; reason?: string } {
  if (!content || content.length < 50) {
    return { score: -30, reason: 'Content too short' };
  }

  const textToAnalyze = `${title} ${content}`.toLowerCase();
  let score = 0;
  let positiveSignals = 0;
  let negativeSignals = 0;

  // Check for hallucination phrases
  for (const phrase of HALLUCINATION_PHRASES) {
    if (textToAnalyze.includes(phrase.toLowerCase())) {
      negativeSignals++;
      score -= 10;
    }
  }

  // Check for grounding evidence
  if (GROUNDING_PATTERNS.specificDate.test(content)) {
    positiveSignals++;
    score += 20;
  } else if (GROUNDING_PATTERNS.yearOnly.test(content)) {
    positiveSignals++;
    score += 5;
  }

  if (GROUNDING_PATTERNS.dollarAmount.test(content)) {
    positiveSignals++;
    score += 15;
  }

  if (GROUNDING_PATTERNS.directQuote.test(content)) {
    positiveSignals++;
    score += 20;
  }

  if (GROUNDING_PATTERNS.executiveAttribution.test(content)) {
    positiveSignals++;
    score += 15;
  }

  if (GROUNDING_PATTERNS.percentageMetric.test(content)) {
    positiveSignals++;
    score += 10;
  }

  if (GROUNDING_PATTERNS.specificNumber.test(content)) {
    positiveSignals++;
    score += 10;
  }

  // Both company names mentioned together is a strong signal
  const companyLower = companyName.toLowerCase();
  if (competitorName) {
    const competitorLower = competitorName.toLowerCase();
    const contentLower = content.toLowerCase();

    // Check if both names appear in same sentence (roughly within 200 chars)
    const companyIndex = contentLower.indexOf(companyLower);
    const competitorIndex = contentLower.indexOf(competitorLower);

    if (companyIndex !== -1 && competitorIndex !== -1) {
      const distance = Math.abs(companyIndex - competitorIndex);
      if (distance < 200) {
        positiveSignals++;
        score += 25;
      } else {
        score += 10;
      }
    }
  }

  // If no positive signals at all and multiple negative ones, penalize more
  if (positiveSignals === 0 && negativeSignals >= 2) {
    score -= 20;
  }

  return { score: Math.max(-50, Math.min(50, score)) };
}

/**
 * Calculate cross-reference score based on multiple results
 * Returns 0 to +30
 */
function calculateCrossReferenceScore(result: SearchResultInput, allResults: SearchResultInput[]): number {
  let score = 0;
  const resultUrl = result.url.toLowerCase();
  const resultTitleWords = result.title.toLowerCase().split(/\s+/).filter(w => w.length > 4);

  for (const other of allResults) {
    if (other.url === result.url) continue;

    const otherUrl = other.url.toLowerCase();
    const otherTitle = other.title.toLowerCase();
    const otherContent = other.content.toLowerCase();

    // Same domain mentioned multiple times
    try {
      const resultDomain = new URL(resultUrl).hostname;
      const otherDomain = new URL(otherUrl).hostname;
      if (resultDomain === otherDomain && resultUrl !== otherUrl) {
        score += 5;
      }
    } catch {
      // Invalid URL, skip
    }

    // Title keywords appear in other results' content
    let matchedKeywords = 0;
    for (const word of resultTitleWords) {
      if (otherContent.includes(word) || otherTitle.includes(word)) {
        matchedKeywords++;
      }
    }
    if (matchedKeywords >= 2) {
      score += 5;
    }
  }

  return Math.min(30, score);
}

/**
 * Score and filter search results
 * Returns only results that pass the confidence threshold
 */
export function scoreAndFilterResults(
  results: SearchResultInput[],
  companyName: string,
  competitorName?: string,
  options: {
    minConfidence?: number;
    maxResults?: number;
    debug?: boolean;
  } = {}
): ScoredResult[] {
  const { minConfidence = 60, maxResults = 10, debug = false } = options;

  const scoredResults: ScoredResult[] = [];

  for (const result of results) {
    const baseScore = 50;
    const tavilyScore = (result.score || 0.5) * 20; // 0-20 from Tavily

    const urlResult = calculateUrlScore(result.url, companyName);
    const contentResult = calculateContentScore(result.content, result.title, companyName, competitorName);
    const crossRefScore = calculateCrossReferenceScore(result, results);

    // Cap individual scores
    const cappedUrlScore = Math.max(-30, Math.min(30, urlResult.score));
    const cappedContentScore = Math.max(-30, Math.min(30, contentResult.score));

    const confidence = Math.round(
      baseScore +
      tavilyScore +
      cappedUrlScore +
      cappedContentScore +
      crossRefScore
    );

    // Determine rejection or inclusion
    let rejectionReason: string | undefined;

    if (urlResult.score <= -40) {
      rejectionReason = urlResult.reason;
    } else if (confidence < minConfidence) {
      rejectionReason = `Low confidence: ${confidence} (URL: ${urlResult.score}, Content: ${contentResult.score})`;
    }

    if (debug) {
      console.log(`[AntiHallucination] ${result.url}`);
      console.log(`  Tavily: ${tavilyScore.toFixed(1)}, URL: ${cappedUrlScore}, Content: ${cappedContentScore}, CrossRef: ${crossRefScore}`);
      console.log(`  Confidence: ${confidence}${rejectionReason ? ` - REJECTED: ${rejectionReason}` : ''}`);
    }

    if (!rejectionReason) {
      scoredResults.push({
        ...result,
        confidence,
        unverified: confidence >= 60 && confidence < 75,
        rejectionReason: undefined,
      });
    } else if (debug) {
      scoredResults.push({
        ...result,
        confidence,
        unverified: true,
        rejectionReason,
      });
    }
  }

  // Sort by confidence descending
  scoredResults.sort((a, b) => b.confidence - a.confidence);

  // Return only included results (no rejection reason) up to maxResults
  return scoredResults
    .filter(r => !r.rejectionReason)
    .slice(0, maxResults);
}

/**
 * Generate better search queries that are less likely to return hallucinated results
 */
export function generateCompetitorSearchQueries(
  companyName: string,
  competitorName: string
): string[] {
  return [
    // Press release pattern - most reliable
    `"${competitorName}" "${companyName}" site:businesswire.com OR site:prnewswire.com`,

    // News announcement pattern
    `"${competitorName}" announces "${companyName}"`,
    `"${competitorName}" selects "${companyName}"`,
    `"${competitorName}" partners "${companyName}"`,

    // Specific deployment/adoption pattern
    `"${competitorName}" deploys "${companyName}"`,
    `"${competitorName}" implements "${companyName}"`,
  ];
}
