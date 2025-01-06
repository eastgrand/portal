import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|assets|api).*)',
  ],
};

export async function middleware(request: NextRequest) {
  try {
    const res = NextResponse.next();
    
    // Create Supabase client
    const supabase = createMiddlewareClient({ req: request, res });
    
    // Refresh session if it exists
    const { data: { session } } = await supabase.auth.getSession();
    
    // If no session, allow the request to continue
    if (!session) {
      return res;
    }

    // Check if MFA is required
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const requiresMFA = (factors?.all?.length ?? 0) > 0;

    // If MFA is required and not on the verify page, redirect
    if (requiresMFA && !request.nextUrl.pathname.includes('/auth/verify')) {
      return NextResponse.redirect(new URL('/auth/verify', request.nextUrl.origin));
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}