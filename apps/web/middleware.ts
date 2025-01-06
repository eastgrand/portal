import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Explicitly set middleware to run at the edge
export const config = {
  runtime: 'experimental-edge',
  regions: ['all'],
  matcher: [
    // Skip all internal paths (_next)
    // Skip all static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

export default async function middleware(request: NextRequest) {
  // Basic response to continue the request
  const response = NextResponse.next();

  try {
    const authCookie = request.cookies.get('sb-access-token');
    if (!authCookie) {
      return response;
    }
    
    return response;
  } catch (error) {
    // If anything fails, just continue the request
    console.error('Middleware error:', error);
    return response;
  }
}