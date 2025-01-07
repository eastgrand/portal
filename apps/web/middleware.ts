import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Temporarily disable middleware by matching nothing
export const config = {
  matcher: []
}

export function middleware(request: NextRequest) {
  return NextResponse.next();
}