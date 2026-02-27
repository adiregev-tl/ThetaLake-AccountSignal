import { AnalysisResult, QuickFacts, LinkItem, MAItem, CompetitorMentionItem, LeadershipChangeItem, RegulatoryBodyMention, RegulatoryEventItem, RegulatoryEventSource } from '@/types/analysis';

function parseTagContent(text: string, tag: string): string {
  const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

function isValidUrl(str: string): boolean {
  if (!str) return false;
  // Check if it's a valid URL starting with http/https
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function extractUrl(text: string): string {
  if (!text) return '';

  // Already a valid URL
  if (isValidUrl(text)) return text;

  // Try to extract URL from markdown link format [text](url)
  const markdownMatch = text.match(/\[.*?\]\((https?:\/\/[^\s)]+)\)/);
  if (markdownMatch) return markdownMatch[1];

  // Try to find any URL in the text
  const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
  if (urlMatch) return urlMatch[1];

  return '';
}

function parseListItems(content: string): LinkItem[] {
  if (!content) return [];
  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      // Remove leading numbers/bullets
      const cleanLine = line.replace(/^[\d\-\*\.]+\s*/, '').trim();
      const parts = cleanLine.split('|').map((p) => p.trim());

      if (parts.length >= 3) {
        return {
          title: parts[0].replace(/\[.*?\]\(.*?\)/, '').trim() || parts[0],
          url: extractUrl(parts[1]) || extractUrl(parts[0]),
          summary: parts[2]
        };
      } else if (parts.length === 2) {
        return {
          title: parts[0].replace(/\[.*?\]\(.*?\)/, '').trim() || parts[0],
          url: extractUrl(parts[1]) || extractUrl(parts[0]),
          summary: ''
        };
      }
      // Single item - try to extract URL from it
      const url = extractUrl(cleanLine);
      const title = cleanLine.replace(/(https?:\/\/[^\s]+)/g, '').replace(/\[|\]|\(|\)/g, '').trim();
      return { title: title || cleanLine, url, summary: '' };
    });
}

function parseQuickFacts(content: string): QuickFacts {
  if (!content) return {};
  const facts: QuickFacts = {};
  content.split('\n').forEach((line) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      if (key && value) {
        const normalizedKey = key
          .toLowerCase()
          .replace(/\s+/g, '')
          .replace('employeecount', 'employeeCount')
          .replace('marketcap', 'marketCap');
        facts[normalizedKey] = value;
      }
    }
  });
  return facts;
}

// Patterns that indicate hallucinated/placeholder M&A entries
const HALLUCINATED_MA_PATTERNS = [
  // Placeholder letters
  /\b(xyz|abc|def)\b/i,
  // Generic placeholder names
  /\b(startup|company|firm|corp|bank)\s+(xyz|abc|one|two|a|b|c)\b/i,
  /\b(fintech|tech|digital|regional|local|national)\s+(startup|company|firm)\b/i,
  // Generic descriptions without real names
  /^(investment\s+firm|wealth\s+management\s+firm|regional\s+bank|fintech\s+startup|tech\s+company)$/i,
  /^(non-core\s+asset|asset\s+division|business\s+unit)$/i,
  // Placeholder patterns
  /\[(company|name|target)\]/i,
  /\b(example|sample|placeholder|tbd|n\/a)\b/i,
  // Format instructions being returned as data
  /target\/partner/i,
  /real\s+verified\s+company/i,
  /if\s+known/i,
  /strategic\s+rationale/i,
  /deal\s+value/i,
];

// Patterns for invalid M&A type field
const INVALID_MA_TYPE_PATTERNS = [
  /acquisition\/merger\/divestiture/i,
  /type\s*\(/i,
  /format:/i,
];

function isHallucinatedMAEntry(target: string, type?: string): boolean {
  const targetLower = target.toLowerCase().trim();
  const typeLower = (type || '').toLowerCase().trim();

  // Check target for hallucinated patterns
  if (HALLUCINATED_MA_PATTERNS.some(pattern => pattern.test(targetLower))) {
    return true;
  }

  // Check type for invalid patterns (format instructions)
  if (INVALID_MA_TYPE_PATTERNS.some(pattern => pattern.test(typeLower))) {
    return true;
  }

  return false;
}

function parseMAActivity(content: string): MAItem[] {
  if (!content) return [];
  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      return {
        year: parts[0] || '',
        type: parts[1] || '',
        target: parts[2] || '',
        dealValue: parts[3] || undefined,
        rationale: parts[4] || undefined
      };
    })
    .filter((m) => m.year && m.target && !isHallucinatedMAEntry(m.target, m.type));
}

function parseCompetitorMentions(content: string): CompetitorMentionItem[] {
  if (!content) return [];
  const validMentionTypes = ['customer', 'partner', 'comparison', 'case_study', 'press_release', 'integration', 'other'];

  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      // Format: Competitor Name | Mention Type | Title | URL | Date | Brief summary
      const mentionType = (parts[1] || 'other').toLowerCase().replace(/\s+/g, '_');
      const url = extractUrl(parts[3]) || '';
      // Only include if URL is a real external URL (not empty or localhost)
      const isValidExternalUrl = url && url.startsWith('https://') && !url.includes('localhost') && !url.includes('marketpulse');
      return {
        competitorName: parts[0] || '',
        mentionType: (validMentionTypes.includes(mentionType) ? mentionType : 'other') as CompetitorMentionItem['mentionType'],
        title: parts[2] || '',
        url: isValidExternalUrl ? url : '',
        date: parts[4] || undefined,
        summary: parts[5] || ''
      };
    })
    .filter((m) => m.competitorName && m.title && m.url);
}

// Common fake/placeholder names that LLMs often generate
const FAKE_NAMES = [
  'john doe', 'jane doe', 'john smith', 'jane smith',
  'bob smith', 'alice smith', 'mary smith', 'james smith',
  'michael johnson', 'sarah johnson', 'david williams', 'jennifer brown',
  'robert jones', 'patricia davis', 'william miller', 'linda wilson',
  'example', 'sample', 'test', 'placeholder', 'tbd', 'n/a', 'unknown'
];

function isFakeName(name: string): boolean {
  const nameLower = name.toLowerCase().trim();
  return FAKE_NAMES.some(fake => nameLower === fake || nameLower.includes(fake));
}

function parseLeadershipChanges(content: string): LeadershipChangeItem[] {
  if (!content) return [];
  const validChangeTypes = ['appointed', 'promoted', 'departed', 'expanded_role'];

  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      // Format: Name | New Role | Change Type | Date | Previous Role | Source URL
      const changeType = (parts[2] || 'appointed').toLowerCase().replace(/\s+/g, '_');
      return {
        name: parts[0] || '',
        role: parts[1] || '',
        changeType: (validChangeTypes.includes(changeType) ? changeType : 'appointed') as LeadershipChangeItem['changeType'],
        date: parts[3] || undefined,
        previousRole: parts[4] || undefined,
        url: extractUrl(parts[5]) || undefined
      };
    })
    .filter((l) => l.name && l.role && !isFakeName(l.name));
}

function parseNumberedList(content: string): string[] {
  if (!content) return [];
  return content
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => l.replace(/^\d+\.\s*/, '').trim())
    .filter((l) => l);
}

function parseSources(content: string): string[] {
  if (!content) return [];
  return content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('http'));
}

function normalizeSentiment(sentiment: string): AnalysisResult['sentiment'] {
  const normalized = sentiment.toUpperCase().trim();
  if (['BULLISH', 'BEARISH', 'MIXED', 'NEUTRAL'].includes(normalized)) {
    return normalized as AnalysisResult['sentiment'];
  }
  return 'NEUTRAL';
}

function parseRegulatoryLandscape(content: string): RegulatoryBodyMention[] {
  if (!content) return [];

  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      // Format: Regulatory Body | Context | Source URL
      return {
        body: parts[0] || '',
        context: parts[1] || '',
        url: extractUrl(parts[2]) || undefined
      };
    })
    .filter((r) => r.body && r.context);
}

function parseRegulatoryEvents(content: string): RegulatoryEventItem[] {
  if (!content) return [];
  const validEventTypes = ['fine', 'penalty', 'settlement', 'enforcement', 'investigation', 'consent', 'order', 'action', 'other'];

  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      // Remove leading numbers/bullets
      const cleanLine = line.replace(/^[\d\-\*\.]+\s*/, '').trim();
      const parts = cleanLine.split('|').map((p) => p.trim());
      // Format: Date | Regulatory Body | Event Type | Amount | Description | URL
      const eventType = (parts[2] || 'other').toLowerCase().replace(/\s+/g, '_');
      const url = extractUrl(parts[5]) || extractUrl(parts[4]) || '';

      return {
        date: parts[0] || '',
        regulatoryBody: parts[1] || '',
        eventType: (validEventTypes.includes(eventType) ? eventType : 'other') as RegulatoryEventItem['eventType'],
        amount: parts[3] && parts[3] !== 'N/A' && parts[3] !== '-' && parts[3] !== 'n/a' ? parts[3] : undefined,
        description: parts[4] || '',
        url: url
      };
    })
    // Only require date, regulatory body, and description - URL is optional
    .filter((e) => e.date && e.regulatoryBody && e.description);
}

/**
 * Normalize an amount string to a numeric value for comparison
 * e.g., "$151M" -> 151000000, "$151 million" -> 151000000
 */
function normalizeAmount(amount: string | undefined): number | null {
  if (!amount) return null;

  const cleaned = amount.toLowerCase().replace(/[,$\s]/g, '');

  // Extract number and multiplier
  const match = cleaned.match(/([\d.]+)\s*(billion|b|million|m|thousand|k)?/i);
  if (!match) return null;

  let value = parseFloat(match[1]);
  const multiplier = match[2]?.toLowerCase();

  if (multiplier === 'billion' || multiplier === 'b') {
    value *= 1_000_000_000;
  } else if (multiplier === 'million' || multiplier === 'm') {
    value *= 1_000_000;
  } else if (multiplier === 'thousand' || multiplier === 'k') {
    value *= 1_000;
  }

  return value;
}

/**
 * Extract year from a date string
 */
function extractYear(date: string): number | null {
  const match = date.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0]) : null;
}

/**
 * Check if two amounts are similar (within 5% tolerance)
 */
function amountsAreSimilar(a1: number | null, a2: number | null): boolean {
  if (a1 === null || a2 === null) return false;
  const tolerance = 0.05; // 5% tolerance
  const diff = Math.abs(a1 - a2);
  const avg = (a1 + a2) / 2;
  return diff / avg < tolerance;
}

/**
 * Extract significant words from a description for similarity matching.
 * Strips common stop words and short words.
 */
function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'into', 'its', 'was', 'were', 'has',
    'had', 'have', 'been', 'will', 'that', 'this', 'over', 'than', 'also',
  ]);
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
  );
}

/**
 * Check if two descriptions have significant keyword overlap (>40% of shorter set).
 */
function descriptionsOverlap(desc1: string, desc2: string): boolean {
  const kw1 = extractKeywords(desc1);
  const kw2 = extractKeywords(desc2);
  if (kw1.size === 0 || kw2.size === 0) return false;
  let overlap = 0;
  for (const w of kw1) {
    if (kw2.has(w)) overlap++;
  }
  const smaller = Math.min(kw1.size, kw2.size);
  return overlap / smaller >= 0.4;
}

// Maximum additional sources to keep per deduplicated event
const MAX_ADDITIONAL_SOURCES = 2;

/**
 * Deduplicate regulatory events by grouping similar events together.
 * Events are considered duplicates if:
 *   - Amounts are similar AND dates are within 1 year, OR
 *   - Same regulatory body AND same year AND description keyword overlap >40%, OR
 *   - Same regulatory body AND same year AND both have no amount
 * Additional sources are capped at 2 (3 total including primary).
 */
export function deduplicateRegulatoryEvents(events: RegulatoryEventItem[]): RegulatoryEventItem[] {
  if (events.length <= 1) return events;

  const grouped: RegulatoryEventItem[] = [];
  const used = new Set<number>();

  for (let i = 0; i < events.length; i++) {
    if (used.has(i)) continue;

    const event = events[i];
    const eventAmount = normalizeAmount(event.amount);
    const eventYear = extractYear(event.date);
    const eventBody = event.regulatoryBody.toUpperCase();

    // Find all similar events
    const similarIndices: number[] = [i];
    const sources: RegulatoryEventSource[] = [];

    // Add first event's source
    if (event.url) {
      sources.push({
        url: event.url,
        title: event.description.slice(0, 80),
        regulatoryBody: event.regulatoryBody
      });
    }

    for (let j = i + 1; j < events.length; j++) {
      if (used.has(j)) continue;

      const otherEvent = events[j];
      const otherAmount = normalizeAmount(otherEvent.amount);
      const otherYear = extractYear(otherEvent.date);
      const otherBody = otherEvent.regulatoryBody.toUpperCase();

      const yearMatch = eventYear && otherYear && Math.abs(eventYear - otherYear) <= 1;
      const sameBody = eventBody === otherBody;
      const amountMatch = eventAmount && otherAmount && amountsAreSimilar(eventAmount, otherAmount);
      const descMatch = descriptionsOverlap(event.description, otherEvent.description);

      const isDuplicate =
        // Case 1: Similar amounts + close dates
        (amountMatch && yearMatch) ||
        // Case 2: Same regulator + close dates + description overlap
        (sameBody && yearMatch && descMatch) ||
        // Case 3: Same regulator + close dates + neither has an amount
        (sameBody && yearMatch && !eventAmount && !otherAmount);

      if (isDuplicate) {
        similarIndices.push(j);
        used.add(j);

        if (otherEvent.url) {
          sources.push({
            url: otherEvent.url,
            title: otherEvent.description.slice(0, 80),
            regulatoryBody: otherEvent.regulatoryBody
          });
        }
      }
    }

    used.add(i);

    // Create merged event
    if (sources.length > 1) {
      // Multiple sources — pick the best primary event (prefer official sources)
      const officialRegulators = ['SEC', 'DOJ', 'CFTC', 'OCC', 'FINRA', 'FCA'];
      const primaryIndex = similarIndices.find(idx =>
        officialRegulators.some(reg => events[idx].regulatoryBody.toUpperCase().includes(reg))
      ) || similarIndices[0];

      const primaryEvent = events[primaryIndex];

      grouped.push({
        ...primaryEvent,
        // Keep the best amount if primary doesn't have one
        amount: primaryEvent.amount || events[similarIndices.find(idx => events[idx].amount) ?? primaryIndex].amount,
        sources: sources
          .filter(s => s.url !== primaryEvent.url)
          .slice(0, MAX_ADDITIONAL_SOURCES)
      });
    } else {
      grouped.push(event);
    }
  }

  // Sort by date (most recent first)
  return grouped.sort((a, b) => {
    const yearA = extractYear(a.date) || 0;
    const yearB = extractYear(b.date) || 0;
    return yearB - yearA;
  });
}

function parseCompetitorList(content: string): string[] {
  if (!content) return [];
  return content
    .split('\n')
    .map(line => line.replace(/^[\d\-\*\.]+\s*/, '').trim())
    .filter(line => line.length > 0 && line.length < 100)
    .slice(0, 8);
}

export function parseTaggedResponse(text: string): AnalysisResult {
  return {
    summary: parseTagContent(text, 'SUMMARY'),
    sentiment: normalizeSentiment(parseTagContent(text, 'SENTIMENT')),
    quickFacts: parseQuickFacts(parseTagContent(text, 'QUICK_FACTS')),
    investorDocs: parseListItems(parseTagContent(text, 'INVESTOR_DOCS')),
    keyPriorities: parseNumberedList(parseTagContent(text, 'KEY_PRIORITIES')),
    growthInitiatives: parseNumberedList(parseTagContent(text, 'GROWTH_INITIATIVES')),
    techNews: parseListItems(parseTagContent(text, 'TECH_NEWS')).filter(item => item.url),
    caseStudies: parseListItems(parseTagContent(text, 'CASE_STUDIES')),
    competitorMentions: parseCompetitorMentions(parseTagContent(text, 'COMPETITOR_MENTIONS')),
    discoveredCompetitors: parseCompetitorList(parseTagContent(text, 'COMPLIANCE_VENDORS')),
    leadershipChanges: parseLeadershipChanges(parseTagContent(text, 'LEADERSHIP_CHANGES')),
    maActivity: parseMAActivity(parseTagContent(text, 'MA_ACTIVITY')),
    regulatoryLandscape: parseRegulatoryLandscape(parseTagContent(text, 'REGULATORY_LANDSCAPE')),
    regulatoryEvents: parseRegulatoryEvents(parseTagContent(text, 'REGULATORY_EVENTS')),
    sources: parseSources(parseTagContent(text, 'SOURCES'))
  };
}
