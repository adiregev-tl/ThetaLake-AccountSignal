'use client';

import { Shield, ExternalLink } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { RegulatoryBodyMention } from '@/types/analysis';

interface RegulatoryLandscapeProps {
  regulators: RegulatoryBodyMention[];
}

// Regulatory body colors for visual distinction
const REGULATOR_COLORS: Record<string, string> = {
  SEC: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  FINRA: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  FCA: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  CFTC: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  ESMA: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  OCC: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  FDIC: 'bg-green-500/20 text-green-400 border-green-500/30',
  'Federal Reserve': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  PRA: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  MAS: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  ASIC: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  BaFin: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  DOJ: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function getRegulatorColor(body: string): string {
  // Check for exact match first
  if (REGULATOR_COLORS[body]) return REGULATOR_COLORS[body];

  // Check if body contains a known regulator
  for (const [key, value] of Object.entries(REGULATOR_COLORS)) {
    if (body.toUpperCase().includes(key.toUpperCase())) return value;
  }

  // Default color
  return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
}

export function RegulatoryLandscape({ regulators }: RegulatoryLandscapeProps) {
  return (
    <SectionCard title="Regulatory Landscape" icon={Shield} color="blue">
      <div className="space-y-3">
        {regulators.length > 0 ? (
          regulators.map((regulator, i) => (
            <div
              key={i}
              className="p-3 bg-zinc-900/50 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <span className={`px-2 py-1 rounded text-xs font-semibold border ${getRegulatorColor(regulator.body)}`}>
                  {regulator.body}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-300 text-sm">
                    {regulator.context}
                  </p>
                  {regulator.url && (
                    <a
                      href={regulator.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-xs mt-2 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View source
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-zinc-500 text-sm">No regulatory information found</p>
        )}
      </div>
    </SectionCard>
  );
}
