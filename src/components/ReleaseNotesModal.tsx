'use client';

import { FileText, Plus, Wrench, RefreshCw, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { releaseNotes, ReleaseNote } from '@/lib/releaseNotes';

interface ReleaseNotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryIcons = {
  Added: Plus,
  Fixed: Wrench,
  Changed: RefreshCw,
  Removed: Trash2,
};

const categoryColors = {
  Added: 'text-emerald-600 dark:text-emerald-400',
  Fixed: 'text-amber-600 dark:text-amber-400',
  Changed: 'text-blue-600 dark:text-blue-400',
  Removed: 'text-red-600 dark:text-red-400',
};

function VersionSection({ release }: { release: ReleaseNote }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-foreground">v{release.version}</span>
        <span className="text-sm text-muted-foreground">{release.date}</span>
      </div>

      {/* Highlights */}
      <div className="flex flex-wrap gap-2">
        {release.highlights.map((highlight, i) => (
          <span
            key={i}
            className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-700 dark:text-emerald-400 text-xs"
          >
            {highlight}
          </span>
        ))}
      </div>

      {/* Detailed changes */}
      {release.changes && (
        <div className="space-y-3 pl-2">
          {release.changes.map((change, i) => {
            const Icon = categoryIcons[change.category];
            const colorClass = categoryColors[change.category];
            return (
              <div key={i} className="space-y-1.5">
                <div className={`flex items-center gap-2 ${colorClass} text-sm font-medium`}>
                  <Icon className="w-4 h-4" />
                  {change.category}
                </div>
                <ul className="space-y-1 pl-6">
                  {change.items.map((item, j) => (
                    <li key={j} className="text-muted-foreground text-sm list-disc">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ReleaseNotesModal({ open, onOpenChange }: ReleaseNotesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Release Notes
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-2">
          <div className="space-y-6 py-4">
            {releaseNotes.map((release, i) => (
              <div key={release.version}>
                <VersionSection release={release} />
                {i < releaseNotes.length - 1 && (
                  <div className="border-t border-border mt-6" />
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
