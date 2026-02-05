'use client';

import { Search, ExternalLink, Building2, Handshake, Scale, FileText, Newspaper, MoreHorizontal, Calendar, Plug, AlertTriangle } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { CompetitorMentionItem } from '@/types/analysis';

interface CompetitorMentionsProps {
  mentions: CompetitorMentionItem[];
}

const COMPETITOR_LIST = [
  'Smarsh', 'Global Relay', 'NICE', 'Verint', 'Arctera', 'Veritas',
  'Proofpoint', 'Shield', 'Behavox', 'Digital Reasoning', 'Mimecast', 'ZL Technologies'
];

const mentionTypeIcons: Record<string, typeof Building2> = {
  customer: Building2,
  partner: Handshake,
  comparison: Scale,
  case_study: FileText,
  press_release: Newspaper,
  integration: Plug,
  other: MoreHorizontal,
};

const mentionTypeLabels: Record<string, string> = {
  customer: 'Customer',
  partner: 'Partner',
  comparison: 'Comparison',
  case_study: 'Case Study',
  press_release: 'Press Release',
  integration: 'Integration',
  other: 'Mention',
};

const mentionTypeColors: Record<string, string> = {
  customer: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
  partner: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
  comparison: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  case_study: 'text-purple-600 dark:text-purple-400 bg-purple-500/10',
  press_release: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10',
  integration: 'text-violet-600 dark:text-violet-400 bg-violet-500/10',
  other: 'text-muted-foreground bg-muted/50',
};

export function CompetitorMentions({ mentions }: CompetitorMentionsProps) {
  // Group mentions by competitor
  const groupedMentions = mentions.reduce((acc, mention) => {
    if (!acc[mention.competitorName]) {
      acc[mention.competitorName] = [];
    }
    acc[mention.competitorName].push(mention);
    return acc;
  }, {} as Record<string, CompetitorMentionItem[]>);

  const hasAnyMentions = mentions.length > 0;

  return (
    <SectionCard title="Competitor Mentions" icon={Search} color="amber">
      <div className="space-y-4">
        <p className="text-muted-foreground text-xs">
          Mentions found across: {COMPETITOR_LIST.join(', ')}
        </p>

        {hasAnyMentions ? (
          <div className="space-y-4">
            {Object.entries(groupedMentions).map(([competitor, items]) => (
              <div key={competitor} className="space-y-2">
                <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {competitor}
                  <span className="text-xs text-muted-foreground">({items.length} mention{items.length !== 1 ? 's' : ''})</span>
                </h4>
                <div className="grid gap-2 pl-6">
                  {items.map((mention, i) => {
                    const Icon = mentionTypeIcons[mention.mentionType] || MoreHorizontal;
                    const colorClass = mentionTypeColors[mention.mentionType] || mentionTypeColors.other;
                    const label = mentionTypeLabels[mention.mentionType] || 'Mention';

                    return (
                      <a
                        key={i}
                        href={mention.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-card/50 dark:bg-muted/50 rounded-lg hover:bg-accent/50 active:bg-muted transition-colors"
                      >
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium w-fit ${colorClass}`}>
                          <Icon className="w-3 h-3" />
                          {label}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-foreground text-sm font-medium line-clamp-2 sm:line-clamp-1 group-hover:text-foreground/80 transition-colors">
                              {mention.title}
                            </span>
                            <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
                          </div>
                          {mention.summary && (
                            <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                              {mention.summary}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {mention.date && (
                              <span className="flex items-center gap-1 text-muted-foreground text-xs">
                                <Calendar className="w-3 h-3" />
                                {mention.date}
                              </span>
                            )}
                            {mention.unverified && (
                              <span className="flex items-center gap-1 text-amber-500 text-xs">
                                <AlertTriangle className="w-3 h-3" />
                                Unverified
                              </span>
                            )}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No competitor mentions found</p>
        )}
      </div>
    </SectionCard>
  );
}
