import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    // Match all paths except static files and api routes
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
  regions: ['iad1'],
  unstable_allowDynamic: [
    '**/node_modules/**',
  ]
}

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent');
  const authCookie = request.cookies.get('sb-access-token');
  
  return NextResponse.next();
}