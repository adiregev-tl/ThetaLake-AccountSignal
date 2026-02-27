import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  // Validate redirect path to prevent open redirects
  const safePath = (next.startsWith('/') && !next.startsWith('//')) ? next : '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${safePath}`);
    }

    console.error('Auth callback error:', error);
  }

  // Return to home with error
  return NextResponse.redirect(`${origin}/?error=auth_failed`);
}
