import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Explicitly tell Next.js this is an edge middleware
export const runtime = 'experimental-edge';

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};

export async function middleware(request: NextRequest) {
  // Create a response object
  const response = NextResponse.next();
  
  // Get auth cookie
  const authCookie = request.cookies.get('sb-access-token');
  
  // If no auth cookie, just continue
  if (!authCookie) {
    return response;
  }

  return response;
}