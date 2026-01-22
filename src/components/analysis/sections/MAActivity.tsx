import { Briefcase } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { MAItem } from '@/types/analysis';

interface MAActivityProps {
  activity: MAItem[];
}

export function MAActivity({ activity }: MAActivityProps) {
  return (
    <SectionCard title="M&A Activity" icon={Briefcase} color="blue">
      <div className="space-y-3">
        {activity.slice(0, 5).map((deal, i) => (
          <div key={i} className="p-3 bg-zinc-900/50 rounded-lg">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  deal.type?.toLowerCase().includes('acquisition')
                    ? 'bg-blue-500/20 text-blue-400'
                    : deal.type?.toLowerCase().includes('merger')
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {deal.type || 'Deal'}
              </span>
              <span className="text-zinc-500 text-xs">{deal.year || ''}</span>
            </div>
            <div className="text-zinc-200 font-medium text-sm">{deal.target || '-'}</div>
            {deal.dealValue && (
              <div className="text-emerald-400 text-xs mt-1">{deal.dealValue}</div>
            )}
            {deal.rationale && (
              <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{deal.rationale}</p>
            )}
          </div>
        ))}
        {activity.length === 0 && (
          <p className="text-zinc-500 text-sm">No M&A activity found</p>
        )}
      </div>
    </SectionCard>
  );
}
