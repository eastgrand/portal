/* eslint-disable @typescript-eslint/no-unsafe-return */
import type { NextRequest } from 'next/server';
import { NextResponse, URLPattern } from 'next/server';
import { CsrfError, createCsrfProtect } from '@edge-csrf/nextjs';
import {
  createClient,
  SupabaseClient,
  SupabaseClientOptions,
} from '@supabase/supabase-js';

export const runtime = 'edge';

// Constants moved from config files for Edge compatibility
const APP_CONFIG = {
  production: process.env.NODE_ENV === 'production',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
};

const PATHS_CONFIG = {
  auth: {
    signIn: '/auth/sign-in',
    verifyMfa: '/auth/verify',
  },
  app: {
    home: '/home',
  },
};

const CSRF_SECRET_COOKIE = 'csrfSecret';
const NEXT_ACTION_HEADER = 'next-action';

export const config = {
  matcher: ['/((?!_next/static|_next/image|images|locales|assets|api/*).*)'],
};

// Define types for Supabase
type Database = {
  public: {
    Tables: Record<string, unknown>;
  };
  auth: {
    Tables: {
      users: {
        Row: {
          id: string;
          app_metadata?: {
            mfa_enabled?: boolean;
            requires_mfa?: boolean;
            role?: string;
          };
        };
      };
    };
  };
};

type EdgeSupabaseClient = SupabaseClient<Database>;
type EdgeClientOptions = SupabaseClientOptions<'public'>;

// Define the return type for pattern handlers
type PatternHandler = (
  request: NextRequest,
  response: NextResponse
) => Promise<NextResponse | undefined | void>;

// Edge-compatible Supabase client creation
function createEdgeClient(request: NextRequest) {
  const options: EdgeClientOptions = {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        cookie: request.headers.get('cookie') ?? '',
      },
    },
  };

  const client = createClient(
    APP_CONFIG.supabaseUrl,
    APP_CONFIG.supabaseAnonKey,
    options
  ) as EdgeSupabaseClient;

  return client;
}

// Edge-compatible MFA check
async function checkRequiresMultiFactorAuthentication(
  client: EdgeSupabaseClient
): Promise<boolean> {
  try {
    const { data: { user }, error } = await client.auth.getUser();
    
    if (error) {
      throw error;
    }

    if (!user) {
      return false;
    }

    // Check if MFA is required based on user metadata
    const requiresMfa = user.app_metadata?.requires_mfa ?? false;
    return requiresMfa;
  } catch (error) {
    console.error('MFA check error:', error);
    return false;
  }
}

const getUser = async (request: NextRequest) => {
  const supabase = createEdgeClient(request);
  return supabase.auth.getUser();
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Set a unique request ID for each request
  setRequestId(request);

  // Apply CSRF protection for mutating requests
  const csrfResponse = await withCsrfMiddleware(request, response);

  // Handle patterns for specific routes
  const handlePattern = matchUrlPattern(request.url);

  // If a pattern handler exists, call it
  if (handlePattern) {
    const patternHandlerResponse = await handlePattern(request, csrfResponse);

    // If a pattern handler returns a response, return it
    if (patternHandlerResponse) {
      return patternHandlerResponse;
    }
  }

  // Append the action path to the request headers
  if (isServerAction(request)) {
    csrfResponse.headers.set('x-action-path', request.nextUrl.pathname);
  }

  return csrfResponse;
}

async function withCsrfMiddleware(
  request: NextRequest,
  response = new NextResponse(),
) {
  const csrfProtect = createCsrfProtect({
    cookie: {
      secure: APP_CONFIG.production,
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

function isServerAction(request: NextRequest) {
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
  } = await getUser(request);

  if (!user || error) {
    return NextResponse.redirect(
      new URL(PATHS_CONFIG.auth.signIn, request.nextUrl.origin).href,
    );
  }

  const role = user?.app_metadata?.role;

  if (!role || role !== 'super-admin') {
    return NextResponse.redirect(new URL('/404', request.nextUrl.origin).href);
  }

  return response;
}

function getPatterns(): Array<{
  pattern: URLPattern;
  handler: PatternHandler;
}> {
  return [
    {
      pattern: new URLPattern({ pathname: '/admin/*?' }),
      handler: adminMiddleware,
    },
    {
      pattern: new URLPattern({ pathname: '/auth/*?' }),
      handler: async (req: NextRequest, _res: NextResponse) => {
        const {
          data: { user },
        } = await getUser(req);

        if (!user) {
          return;
        }

        const isVerifyMfa = req.nextUrl.pathname === PATHS_CONFIG.auth.verifyMfa;

        if (!isVerifyMfa) {
          return NextResponse.redirect(
            new URL(PATHS_CONFIG.app.home, req.nextUrl.origin).href,
          );
        }
      },
    },
    {
      pattern: new URLPattern({ pathname: '/home/*?' }),
      handler: async (req: NextRequest, _res: NextResponse) => {
        const {
          data: { user },
        } = await getUser(req);

        const origin = req.nextUrl.origin;
        const next = req.nextUrl.pathname;

        if (!user) {
          const signIn = PATHS_CONFIG.auth.signIn;
          const redirectPath = `${signIn}?next=${next}`;

          return NextResponse.redirect(new URL(redirectPath, origin).href);
        }

        const supabase = createEdgeClient(req);
        const requiresMultiFactorAuthentication =
          await checkRequiresMultiFactorAuthentication(supabase);

        if (requiresMultiFactorAuthentication) {
          return NextResponse.redirect(
            new URL(PATHS_CONFIG.auth.verifyMfa, origin).href,
          );
        }
      },
    },
  ];
}

function matchUrlPattern(url: string): PatternHandler | undefined {
  const patterns = getPatterns();
  const input = url.split('?')[0];

  for (const pattern of patterns) {
    const patternResult = pattern.pattern.exec(input);

    if (patternResult !== null && 'pathname' in patternResult) {
      return pattern.handler;
    }
  }
  
  return undefined;
}

function setRequestId(request: Request) {
  request.headers.set('x-correlation-id', crypto.randomUUID());
}