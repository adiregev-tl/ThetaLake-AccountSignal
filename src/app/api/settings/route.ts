import { NextRequest, NextResponse } from 'next/server';

// Settings API is disabled when auth is not configured
// Re-enable when Supabase auth is set up

export async function GET() {
  return NextResponse.json(
    { error: 'Settings API requires authentication to be enabled' },
    { status: 503 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Settings API requires authentication to be enabled' },
    { status: 503 }
  );
}
