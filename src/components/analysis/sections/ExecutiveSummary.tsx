import { Building2 } from 'lucide-react';
import { SectionCard } from '../SectionCard';

interface ExecutiveSummaryProps {
  summary: string;
  className?: string;
}

export function ExecutiveSummary({ summary, className = "lg:col-span-2 xl:col-span-3" }: ExecutiveSummaryProps) {
  return (
    <SectionCard title="Executive Summary" icon={Building2} color="emerald" className={className}>
      <p className="text-foreground leading-relaxed">{summary}</p>
    </SectionCard>
  );
}
