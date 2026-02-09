'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function LoginButton() {
  const { signInWithEmail, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isLoading) return;

    setError(null);
    try {
      await signInWithEmail(email.trim());
      setEmailSent(true);
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send login link');
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset state when closing
      setEmail('');
      setEmailSent(false);
      setError(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600"
        >
          <Mail className="w-4 h-4 mr-2" />
          Sign in
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {emailSent ? 'Check your email' : 'Sign in to AccountSignal'}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {emailSent
              ? "We've sent you a magic link. Click the link in your email to sign in."
              : "Enter your email and we'll send you a magic link to sign in."}
          </DialogDescription>
        </DialogHeader>

        {emailSent ? (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-zinc-300 text-center">
              Magic link sent to <span className="font-medium text-white">{email}</span>
            </p>
            <p className="text-zinc-500 text-sm mt-2 text-center">
              The link will expire in 1 hour. Check your spam folder if you don't see it.
            </p>
            <Button
              variant="outline"
              className="mt-4 border-zinc-700 text-zinc-300 hover:text-white"
              onClick={() => {
                setEmailSent(false);
                setEmail('');
              }}
            >
              Use a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                disabled={isLoading}
                autoFocus
              />
              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending link...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send magic link
                </>
              )}
            </Button>
            <p className="text-zinc-500 text-xs text-center">
              First user to sign up becomes the admin.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
