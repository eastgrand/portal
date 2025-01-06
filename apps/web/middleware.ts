import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient, type User, type AuthError } from '@supabase/supabase-js';

// Core configuration
const AUTH_ROUTES = ['/auth/sign-in', '/auth/sign-up', '/auth/verify', '/auth/callback', '/auth/password-reset'];
const PUBLIC_ROUTES = ['/blog', '/docs', '/contact', '/api', '/version', '/privacy-policy', '/terms-of-service'];
const PROTECTED_ROUTES = ['/home', '/admin'];

export const config = {
  matcher: ['/((?!_next/static|_next/image|images|locales|assets|api/*).*)'],
};

type AuthResponse = {
  user: User | null;
  error: AuthError | null;
};

async function getUser(req: NextRequest): Promise<AuthResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      detectSessionInUrl: false,
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const accessToken = req.cookies.get('sb-access-token')?.value;
  
  if (!accessToken) {
    return { user: null, error: null };
  }

  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: req.cookies.get('sb-refresh-token')?.value ?? '',
  });

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  } catch (error) {
    return { user: null, error: error as AuthError };
  }
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const requestId = crypto.randomUUID();
  response.headers.set('x-correlation-id', requestId);

  const pathname = request.nextUrl.pathname;

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return response;
  }

  // Allow auth routes
  if (AUTH_ROUTES.some(route => pathname === route)) {
    try {
      const { user, error } = await getUser(request);
      if (user && !error && pathname !== '/auth/verify') {
        return NextResponse.redirect(new URL('/home', request.url));
      }
    } catch (e) {
      // Continue to auth page if there's any error
      console.error('Auth check failed:', e);
    }
    return response;
  }

  // Check authentication for protected routes
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    try {
      const { user, error } = await getUser(request);

      if (!user || error) {
        // Store the attempted URL to redirect back after login
        const redirectUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;
        const signInUrl = new URL('/auth/sign-in', request.url);
        signInUrl.searchParams.set('next', redirectUrl);
        return NextResponse.redirect(signInUrl);
      }

      // Special handling for admin routes
      if (pathname.startsWith('/admin')) {
        const role = user.app_metadata?.role as string | undefined;
        if (role !== 'super-admin') {
          return NextResponse.redirect(new URL('/404', request.url));
        }
      }
    } catch (e) {
      // Redirect to sign in if there's any error
      console.error('Auth check failed:', e);
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }
  }

  return response;
}