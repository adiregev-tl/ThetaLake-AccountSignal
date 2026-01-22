import { AnalysisResult, QuickFacts, LinkItem, CompetitorItem, MAItem, CompetitorMentionItem, LeadershipChangeItem } from '@/types/analysis';

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

function parseCompetitors(content: string): CompetitorItem[] {
  if (!content) return [];
  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      return {
        name: parts[0] || '',
        marketPosition: parts[1] || '',
        differentiator: parts[2] || ''
      };
    })
    .filter((c) => c.name);
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
    .filter((m) => m.year && m.target);
}

function parseCompetitorMentions(content: string): CompetitorMentionItem[] {
  if (!content) return [];
  const validMentionTypes = ['customer', 'partner', 'comparison', 'case_study', 'press_release', 'other'];

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

export function parseTaggedResponse(text: string): AnalysisResult {
  return {
    summary: parseTagContent(text, 'SUMMARY'),
    sentiment: normalizeSentiment(parseTagContent(text, 'SENTIMENT')),
    quickFacts: parseQuickFacts(parseTagContent(text, 'QUICK_FACTS')),
    investorDocs: parseListItems(parseTagContent(text, 'INVESTOR_DOCS')),
    keyPriorities: parseNumberedList(parseTagContent(text, 'KEY_PRIORITIES')),
    growthInitiatives: parseNumberedList(parseTagContent(text, 'GROWTH_INITIATIVES')),
    techNews: parseListItems(parseTagContent(text, 'TECH_NEWS')),
    caseStudies: parseListItems(parseTagContent(text, 'CASE_STUDIES')),
    competitors: parseCompetitors(parseTagContent(text, 'COMPETITORS')),
    competitorMentions: parseCompetitorMentions(parseTagContent(text, 'COMPETITOR_MENTIONS')),
    leadershipChanges: parseLeadershipChanges(parseTagContent(text, 'LEADERSHIP_CHANGES')),
    maActivity: parseMAActivity(parseTagContent(text, 'MA_ACTIVITY')),
    sources: parseSources(parseTagContent(text, 'SOURCES'))
  };
}
