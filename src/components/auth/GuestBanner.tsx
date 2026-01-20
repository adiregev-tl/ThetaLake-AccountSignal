'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { Info, LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GuestBanner() {
  const { isAuthenticated, isLoading, signInWithGoogle } = useAuth();

  // Don't show banner if authenticated or still loading
  if (isAuthenticated || isLoading) return null;

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-amber-200 font-medium">Preview Mode</p>
            <p className="text-amber-400/70 text-sm">
              Sign in with Google to analyze companies and access full features
            </p>
          </div>
        </div>
        <Button
          onClick={handleSignIn}
          size="sm"
          className="bg-amber-500 hover:bg-amber-400 text-zinc-900 flex-shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <LogIn className="w-4 h-4 mr-2" />
          )}
          Sign in
        </Button>
      </div>
    </div>
  );
}
