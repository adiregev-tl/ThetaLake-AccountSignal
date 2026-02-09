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
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Info className="w-5 h-5 text-emerald-400" />
            About AccountSignal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* App Description */}
          <div className="space-y-3">
            <p className="text-zinc-300 text-sm leading-relaxed">
              Theta Lake AccountSignal is an AI-powered corporate intelligence platform
              built for account teams and go-to-market professionals. Search any company
              to get a comprehensive 360-degree view covering financials, recent news,
              competitive positioning, leadership, and M&amp;A activity.
            </p>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Powered by multiple AI providers (OpenAI, Anthropic, Google, Perplexity)
              with optional web search augmentation for real-time data.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-200">Key Features</h3>
            <ul className="text-zinc-400 text-sm space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                AI-generated executive summaries and sentiment
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                Real-time stock data and financial overview
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                Competitive landscape and market positioning
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                Leadership changes and organizational signals
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                M&amp;A activity and strategic moves
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                Shared analysis cache across the team
              </li>
            </ul>
          </div>

          {/* Version Info */}
          <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
            {providerName && (
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  AI Provider
                </span>
                <span className="text-white text-sm">
                  {providerName}{modelName ? ` · ${modelName}` : ''}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Version</span>
              <span className="text-white font-mono text-sm">v{version}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Build</span>
              <span className="text-zinc-300 font-mono text-sm">{buildId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 text-sm">Built</span>
              <span className="text-zinc-300 text-sm">{buildDate}</span>
            </div>
            <div className="pt-2 border-t border-zinc-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReleaseNotes(true)}
                className="w-full text-zinc-400 hover:text-white hover:bg-zinc-700/50"
              >
                <FileText className="w-4 h-4 mr-2" />
                View Release Notes
              </Button>
            </div>
          </div>

          {/* Copyright */}
          <p className="text-center text-zinc-500 text-xs">
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
