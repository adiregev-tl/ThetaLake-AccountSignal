'use client';

import { useState } from 'react';
import { Info, FileText, Cpu } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ReleaseNotesModal } from './ReleaseNotesModal';
import { buildInfo } from '@/lib/buildInfo';

interface AboutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerName?: string;
  modelName?: string;
}

export function AboutModal({ open, onOpenChange, providerName, modelName }: AboutModalProps) {
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);

  const version = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
  const buildId = buildInfo.commitHash;
  const buildDate = new Date(buildInfo.buildDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-emerald-400" />
            About AccountSignal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto max-h-[calc(85vh-8rem)]">
          {/* App Description */}
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Theta Lake AccountSignal delivers AI-powered corporate intelligence
              for account teams, sales engineers, and go-to-market professionals.
              Search any company to instantly generate a comprehensive 360-degree
              analysis — from executive summaries and financial signals to regulatory
              exposure and competitive landscape.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Key Features</h3>
            <ul className="text-muted-foreground text-sm space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                AI-generated executive summaries with sentiment analysis
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                Real-time stock data, financial overview, and investor documents
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                Competitor mentions verified via web search (zero hallucination)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                Regulatory landscape with links to governing bodies
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                Leadership changes, M&amp;A activity, and enforcement events
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                Usage tracking, cost analytics, and team-wide caching
              </li>
            </ul>
          </div>

          {/* Version Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            {providerName && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  AI Provider
                </span>
                <span className="text-foreground text-sm">
                  {providerName}{modelName ? ` · ${modelName}` : ''}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Version</span>
              <span className="text-foreground font-mono text-sm">v{version}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Build</span>
              <span className="text-foreground font-mono text-sm">{buildId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Built</span>
              <span className="text-foreground text-sm">{buildDate}</span>
            </div>
            <div className="pt-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReleaseNotes(true)}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                <FileText className="w-4 h-4 mr-2" />
                View Release Notes
              </Button>
            </div>
          </div>

          {/* Copyright */}
          <p className="text-center text-muted-foreground text-xs">
            &copy; {new Date().getFullYear()} Theta Lake. All rights reserved.
          </p>
        </div>
      </DialogContent>

      {/* Release Notes Modal */}
      <ReleaseNotesModal
        open={showReleaseNotes}
        onOpenChange={setShowReleaseNotes}
      />
    </Dialog>
  );
}
