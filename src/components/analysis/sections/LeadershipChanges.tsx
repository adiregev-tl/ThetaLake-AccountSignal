'use client';

import { Users, ExternalLink, ArrowRight } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { LeadershipChangeItem } from '@/types/analysis';

interface LeadershipChangesProps {
  changes: LeadershipChangeItem[];
}

// Check if the "name" field looks like an article title vs a person's name
function isArticleTitle(name: string): boolean {
  // Article titles are typically longer and contain certain keywords
  if (name.length > 50) return true;
  const articleKeywords = ['announces', 'appointed', 'names', 'hires', 'promotes', 'leadership changes', 'executive'];
  return articleKeywords.some(kw => name.toLowerCase().includes(kw));
}

export function LeadershipChanges({ changes }: LeadershipChangesProps) {
  // Separate parsed data (real names) from fallback data (article titles)
  const hasParsedData = changes.some(c => !isArticleTitle(c.name));

  return (
    <SectionCard title="Leadership Changes" icon={Users} color="blue" className="xl:col-span-1">
      <div className="space-y-3">
        {changes.length > 0 ? (
          hasParsedData ? (
            // Display parsed leadership changes with actual names and roles
            changes.filter(c => !isArticleTitle(c.name)).slice(0, 8).map((change, i) => (
              <div
                key={i}
                className="p-3 bg-zinc-900/50 rounded-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-zinc-100 font-semibold text-sm">
                      {change.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <ArrowRight className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      <p className="text-emerald-400 text-sm font-medium">
                        {change.role}
                      </p>
                    </div>
                    {change.previousRole && (
                      <p className="text-zinc-500 text-xs mt-1">
                        Previously: {change.previousRole}
                      </p>
                    )}
                    {change.date && (
                      <p className="text-zinc-500 text-xs mt-1">
                        {change.date}
                      </p>
                    )}
                  </div>
                </div>
                {change.url && (
                  <a
                    href={change.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-xs mt-2 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {change.source || 'View announcement'}
                  </a>
                )}
              </div>
            ))
          ) : (
            // Fallback: Display as news articles when parsing didn't extract names
            changes.slice(0, 6).map((change, i) => (
              <a
                key={i}
                href={change.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-zinc-900/50 rounded-lg hover:bg-zinc-800/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-zinc-200 text-sm font-medium line-clamp-2 group-hover:text-white transition-colors">
                    {change.name}
                  </h4>
                  <ExternalLink className="w-4 h-4 text-zinc-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {change.role && (
                  <p className="text-zinc-500 text-xs mt-2 line-clamp-2">
                    {change.role}
                  </p>
                )}
                {change.source && (
                  <p className="text-cyan-400/70 text-xs mt-2">
                    {change.source}
                  </p>
                )}
              </a>
            ))
          )
        ) : (
          <p className="text-zinc-500 text-sm">No recent leadership changes found</p>
        )}
      </div>
    </SectionCard>
  );
}
