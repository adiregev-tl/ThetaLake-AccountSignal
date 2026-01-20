import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Routes that require authentication
const PROTECTED_API_ROUTES = ['/api/analyze'];

// Routes that require admin role
const ADMIN_API_ROUTES = ['/api/settings'];

export async function middleware(request: NextRequest) {
  const { user, response, supabase } = await updateSession(request);

  const path = request.nextUrl.pathname;

  // Check protected API routes
  if (PROTECTED_API_ROUTES.some(route => path.startsWith(route))) {
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
  }

  // Check admin-only routes
  if (ADMIN_API_ROUTES.some(route => path.startsWith(route))) {
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // For PUT/POST requests to settings, verify admin role
    if (request.method === 'PUT' || request.method === 'POST') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      // Type assertion for profile data
      const profileData = profile as { role: string } | null;

      if (profileData?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
