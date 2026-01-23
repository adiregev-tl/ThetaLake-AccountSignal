'use client';

import { AlertTriangle, ExternalLink, DollarSign, Calendar, Building2 } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { RegulatoryEventItem } from '@/types/analysis';

interface RegulatoryEventsProps {
  events: RegulatoryEventItem[];
}

// Event type colors and labels
const EVENT_TYPE_INFO: Record<string, { color: string; label: string }> = {
  fine: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Fine' },
  penalty: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Penalty' },
  settlement: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Settlement' },
  enforcement: { color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', label: 'Enforcement' },
  investigation: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Investigation' },
  other: { color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', label: 'Other' },
};

function getEventTypeInfo(eventType: string) {
  return EVENT_TYPE_INFO[eventType] || EVENT_TYPE_INFO.other;
}

export function RegulatoryEvents({ events }: RegulatoryEventsProps) {
  return (
    <SectionCard title="Regulatory Events" icon={AlertTriangle} color="red">
      <div className="space-y-3">
        <p className="text-zinc-500 text-xs mb-3">
          Enforcement actions, fines, and settlements from the past 5 years
        </p>

        {events.length > 0 ? (
          events.map((event, i) => {
            const typeInfo = getEventTypeInfo(event.eventType);

            return (
              <a
                key={i}
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-zinc-900/50 rounded-lg hover:bg-zinc-800/50 transition-colors group"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                  <span className="flex items-center gap-1 text-zinc-500 text-xs">
                    <Building2 className="w-3 h-3" />
                    {event.regulatoryBody}
                  </span>
                  <span className="flex items-center gap-1 text-zinc-500 text-xs">
                    <Calendar className="w-3 h-3" />
                    {event.date}
                  </span>
                  {event.amount && (
                    <span className="flex items-center gap-1 text-red-400 text-xs font-medium">
                      <DollarSign className="w-3 h-3" />
                      {event.amount}
                    </span>
                  )}
                </div>

                <div className="flex items-start justify-between gap-2">
                  <p className="text-zinc-300 text-sm line-clamp-2 group-hover:text-white transition-colors">
                    {event.description}
                  </p>
                  <ExternalLink className="w-4 h-4 text-zinc-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                </div>
              </a>
            );
          })
        ) : (
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            No regulatory events found in the past 5 years
          </div>
        )}
      </div>
    </SectionCard>
  );
}
