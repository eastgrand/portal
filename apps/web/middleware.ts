import type { NextRequest } from 'next/server';
import { NextResponse, URLPattern } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { CsrfError, createCsrfProtect } from '@edge-csrf/nextjs';
import { checkRequiresMultiFactorAuthentication } from '@kit/supabase/check-requires-mfa';

const CSRF_SECRET_COOKIE = 'csrfSecret';
const NEXT_ACTION_HEADER = 'next-action';

export const config = {
  matcher: ['/((?!_next/static|_next/image|images|locales|assets|api/*).*)'],
};

const getUser = async (request: NextRequest, response: NextResponse) => {
  const supabase = createMiddlewareClient({ req: request, res: response });
  const sessionResponse = await supabase.auth.getSession();
  return { 
    data: { user: sessionResponse.data.session?.user }, 
    error: sessionResponse.error 
  };
};

async function withCsrfMiddleware(
  request: NextRequest,
  response = new NextResponse(),
) {
  const csrfProtect = createCsrfProtect({
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      name: CSRF_SECRET_COOKIE,
    },
    ignoreMethods: isServerAction(request)
      ? ['POST']
      : ['GET', 'HEAD', 'OPTIONS'],
  });

  try {
    await csrfProtect(request, response);
    return response;
  } catch (error) {
    if (error instanceof CsrfError) {
      return NextResponse.json('Invalid CSRF token', {
        status: 401,
      });
    }
    throw error;
  }
}

function isServerAction(request: NextRequest): boolean {
  return request.headers.has(NEXT_ACTION_HEADER);
}

async function adminMiddleware(request: NextRequest, response: NextResponse) {
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin');

  if (!isAdminPath) {
    return response;
  }

  const {
    data: { user },
    error,
  } = await getUser(request, response);

  if (!user || error) {
    return NextResponse.redirect(
      new URL('/auth/sign-in', request.nextUrl.origin).href,
    );
  }

  const role = user?.app_metadata?.role;

  if (!role || role !== 'super-admin') {
    return NextResponse.redirect(new URL('/404', request.nextUrl.origin).href);
  }

  return response;
}

function getPatterns() {
  return [
    {
      pattern: new URLPattern({ pathname: '/admin/*?' }),
      handler: adminMiddleware,
    },
    {
      pattern: new URLPattern({ pathname: '/auth/*?' }),
      handler: async (req: NextRequest, res: NextResponse) => {
        const {
          data: { user },
        } = await getUser(req, res);

        if (!user) {
          return;
        }

        const isVerifyMfa = req.nextUrl.pathname === '/auth/verify';

        if (!isVerifyMfa) {
          return NextResponse.redirect(
            new URL('/home', req.nextUrl.origin).href,
          );
        }
      },
    },
    {
      pattern: new URLPattern({ pathname: '/home/*?' }),
      handler: async (req: NextRequest, res: NextResponse) => {
        const {
          data: { user },
        } = await getUser(req, res);

        const origin = req.nextUrl.origin;
        const next = req.nextUrl.pathname;

        if (!user) {
          const redirectPath = `/auth/sign-in?next=${next}`;
          return NextResponse.redirect(new URL(redirectPath, origin).href);
        }

        const supabase = createMiddlewareClient({ req, res });
        const requiresMultiFactorAuthentication =
          await checkRequiresMultiFactorAuthentication(supabase);

        if (requiresMultiFactorAuthentication) {
          return NextResponse.redirect(
            new URL('/auth/verify', origin).href,
          );
        }
      },
    },
  ];
}

function matchUrlPattern(url: string) {
  const patterns = getPatterns();
  const input = url.split('?')[0];

  for (const pattern of patterns) {
    const patternResult = pattern.pattern.exec(input);
    if (patternResult !== null && 'pathname' in patternResult) {
      return pattern.handler;
    }
  }
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Set request ID
  const requestId = crypto.randomUUID();
  response.headers.set('x-correlation-id', requestId);

  // Apply CSRF protection
  const csrfResponse = await withCsrfMiddleware(request, response);

  // Handle patterns for specific routes
  const handlePattern = matchUrlPattern(request.url);

  if (handlePattern) {
    const patternHandlerResponse = await handlePattern(request, csrfResponse);
    if (patternHandlerResponse) {
      return patternHandlerResponse;
    }
  }

  // Append action path for server actions
  if (isServerAction(request)) {
    csrfResponse.headers.set('x-action-path', request.nextUrl.pathname);
  }

  return csrfResponse;
}