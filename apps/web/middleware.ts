import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Disable automatic parsing of user agent
export const config = {
  matcher: [
    '/protected/:path*',
    '/api/protected/:path*'
  ],
  regions: ['iad1'],
  // This is the key addition that prevents the __dirname error
  unstable_allowDynamic: [
    // This tells Next.js to skip user agent parsing
    '**/node_modules/**',
  ]
}

export function middleware(request: NextRequest) {
  // If you need user agent info, use the raw headers instead of parsed UA
  const userAgent = request.headers.get('user-agent');
  
  const authCookie = request.cookies.get('sb-access-token');
  
  // Add your auth logic here if needed
  // if (!authCookie && request.nextUrl.pathname.startsWith('/protected')) {
  //   return NextResponse.redirect(new URL('/auth/login', request.url));
  // }

  return NextResponse.next();
}