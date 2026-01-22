import { Users } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { CompetitorItem } from '@/types/analysis';

interface CompetitiveLandscapeProps {
  competitors: CompetitorItem[];
}

export function CompetitiveLandscape({ competitors }: CompetitiveLandscapeProps) {
  return (
    <SectionCard title="Competitive Landscape" icon={Users} color="purple">
      <div className="grid gap-3">
        {competitors.slice(0, 5).map((comp, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg"
          >
            <div className="flex-1">
              <span className="text-zinc-200 font-medium">{comp.name}</span>
              {comp.differentiator && (
                <p className="text-zinc-500 text-xs mt-1">{comp.differentiator}</p>
              )}
            </div>
            {comp.marketPosition && (
              <span className="text-zinc-400 text-sm ml-4 flex-shrink-0">
                {comp.marketPosition}
              </span>
            )}
          </div>
        ))}
        {competitors.length === 0 && (
          <p className="text-zinc-500 text-sm">No competitor data available</p>
        )}
      </div>
    </SectionCard>
  );
}
