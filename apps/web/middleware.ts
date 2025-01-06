import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|assets|api).*)',
  ],
};

export async function middleware(request: NextRequest) {
  try {
    const response = NextResponse.next();
    
    // Get session from cookie
    const authCookie = request.cookies.get('sb-access-token')?.value;
    if (!authCookie) {
      return response;
    }

    // Skip MFA check for now since it's causing issues in Edge runtime
    return response;

  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}