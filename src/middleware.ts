import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { rateLimit, getClientIp } from '@/lib/security/rateLimit';

// Routes that require authentication
const PROTECTED_API_ROUTES = ['/api/analyze', '/api/verify-key', '/api/verify-websearch'];

// Routes that require admin role (except GET /api/settings which returns masked data)
const ADMIN_API_ROUTES = ['/api/settings', '/api/admin', '/api/usage'];

// Rate limits: [routePrefix, maxRequests, windowMs]
const RATE_LIMITS: [string, number, number][] = [
  ['/api/analyze', 10, 60_000],          // 10 req/min
  ['/api/verify-key', 5, 60_000],        // 5 req/min
  ['/api/verify-websearch', 5, 60_000],  // 5 req/min
  ['/api/stock', 30, 60_000],            // 30 req/min
  ['/api/company', 30, 60_000],          // 30 req/min
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Rate limiting (checked before auth to block abusive traffic early)
  for (const [route, limit, windowMs] of RATE_LIMITS) {
    if (path.startsWith(route)) {
      const ip = getClientIp(request);
      const { allowed } = rateLimit(`${route}:${ip}`, limit, windowMs);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
      break;
    }
  }

  const { user, response, supabase } = await updateSession(request);

  // Check protected API routes (require authentication)
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

    // GET /api/settings is allowed for all authenticated users (handler masks sensitive data)
    const isSettingsGet = path.startsWith('/api/settings') && request.method === 'GET';

    if (!isSettingsGet) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

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
