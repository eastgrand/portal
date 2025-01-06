/* eslint-disable @typescript-eslint/no-unused-vars */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createMiddlewareClient } from '@kit/supabase/middleware-client';
import { checkRequiresMultiFactorAuthentication } from '@kit/supabase/check-requires-mfa';
import pathsConfig from './config/paths.config';

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|assets|api).*)',
  ],
};

const getUser = (request: NextRequest, response: NextResponse) => {
  const supabase = createMiddlewareClient(request, response);
  return supabase.auth.getUser();
};

export async function middleware(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const supabase = createMiddlewareClient(request, response);

    const {
      data: { user },
    } = await getUser(request, response);

    // If no user, allow the request to continue
    if (!user) {
      return response;
    }

    const requiresMultiFactorAuthentication = 
      await checkRequiresMultiFactorAuthentication(supabase);

    // If MFA is required and not on the verify page, redirect
    if (requiresMultiFactorAuthentication && 
        !request.nextUrl.pathname.includes('/auth/verify')) {
      return NextResponse.redirect(
        new URL(pathsConfig.auth.verifyMfa, request.nextUrl.origin)
      );
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}