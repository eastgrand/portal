import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|assets|api).*)',
  ],
};

export async function middleware(request: NextRequest) {
  try {
    const response = NextResponse.next();
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Get session from cookie
    const authCookie = request.cookies.get('sb-access-token')?.value;
    if (!authCookie) {
      return response;
    }

    // Get user from session
    const { data: { user }, error } = await supabase.auth.getUser(authCookie);
    
    if (error || !user) {
      return response;
    }

    // Check for MFA factors
    const { data: factors } = await supabase.auth.mfa.listFactors();

    const requiresMFA = factors?.all && factors.all.length > 0;

    // If MFA is required and not on verify page, redirect
    if (requiresMFA && !request.nextUrl.pathname.includes('/auth/verify')) {
      return NextResponse.redirect(
        new URL('/auth/verify', request.nextUrl.origin)
      );
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}