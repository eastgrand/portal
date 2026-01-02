import { NextRequest, NextResponse } from 'next/server';

import { SignJWT } from 'jose';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

/**
 * Feature permissions as defined in the database enum
 */
type FeaturePermission =
  | 'view_map'
  | 'view_data'
  | 'export_data'
  | 'export_advanced'
  | 'use_ai_assistant'
  | 'create_segments'
  | 'run_comparisons'
  | 'manage_canvassing'
  | 'view_canvassing'
  | 'view_donors'
  | 'export_donors'
  | 'generate_reports'
  | 'view_reports'
  | 'manage_project_settings'
  | 'manage_project_members';

type ProjectRole = 'owner' | 'admin' | 'member';

/**
 * All available permissions - used for super admins and owners
 */
const ALL_PERMISSIONS: FeaturePermission[] = [
  'view_map',
  'view_data',
  'export_data',
  'export_advanced',
  'use_ai_assistant',
  'create_segments',
  'run_comparisons',
  'manage_canvassing',
  'view_canvassing',
  'view_donors',
  'export_donors',
  'generate_reports',
  'view_reports',
  'manage_project_settings',
  'manage_project_members',
];

interface ProjectTokenPayload {
  userId: string;
  projectId: string;
  accountId: string;
  role: ProjectRole;
  permissions: FeaturePermission[];
  iat: number;
  exp: number;
}

/**
 * POST /api/auth/project-token
 *
 * Generates a signed JWT for authenticating into external project applications.
 * The token contains user identity, project membership, role, and permissions.
 *
 * Request body:
 * - projectId: UUID of the project to generate a token for
 *
 * Response:
 * - token: Signed JWT (30 second expiry)
 *
 * The token can be used by external apps (like the pol app) to verify
 * user identity and permissions without requiring another auth flow.
 */
export async function POST(request: NextRequest) {
  const client = getSupabaseServerClient();
  const adminClient = getSupabaseServerAdminClient();

  // Authenticate the user
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }

  // Parse and validate request body
  let projectId: string;
  try {
    const body = await request.json();
    projectId = body.projectId;

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'projectId is required' },
        { status: 400 }
      );
    }

    // Basic UUID validation
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid projectId format' },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  try {
    // Verify user is a member of the project and get their role
    const { data: membership, error: memberError } = await adminClient
      .from('project_members')
      .select(
        `
        role,
        project:projects (
          id,
          account_id,
          name
        )
      `
      )
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'You do not have access to this project',
        },
        { status: 403 }
      );
    }

    const project = membership.project as {
      id: string;
      account_id: string;
      name: string;
    };

    // Check if user is super admin (they get all permissions)
    // First check app_metadata, then fall back to user_roles table
    let isSuperAdmin = user.app_metadata?.role === 'super-admin';

    if (!isSuperAdmin) {
      const { data: userRole } = await adminClient
        .from('user_roles')
        .select('is_super_admin')
        .eq('user_id', user.id)
        .single();

      isSuperAdmin = userRole?.is_super_admin === true;
    }

    // Build permissions array
    let finalPermissions: FeaturePermission[] = [];

    // Super admins and owners get all permissions
    if (isSuperAdmin || membership.role === 'owner') {
      finalPermissions = ALL_PERMISSIONS;
    } else {
      // Get user's permissions for this project using RPC function
      // Note: This RPC function is defined in the feature_permissions migration
      // If it doesn't exist yet, we'll fall back to empty permissions
      try {
        // Use type assertion since the RPC function may not be in generated types yet
        type RpcFn = (
          fn: string,
          params: Record<string, unknown>
        ) => Promise<{ data: unknown; error: unknown }>;

        const { data: permissions, error: permError } = await (
          adminClient.rpc as unknown as RpcFn
        )('get_user_permissions', {
          target_user_id: user.id,
          target_project_id: projectId,
        });

        if (permError) {
          console.error('Error fetching permissions:', permError);
          // Continue with empty permissions array rather than failing
        } else if (Array.isArray(permissions)) {
          // Validate and filter permissions to ensure they're valid FeaturePermission values
          finalPermissions = permissions.filter((p): p is FeaturePermission =>
            ALL_PERMISSIONS.includes(p as FeaturePermission)
          );
        }
      } catch (rpcError) {
        console.error('RPC call failed (function may not exist):', rpcError);
        // Fall back to empty permissions - the migration may not have been applied yet
      }
    }

    // Get the signing secret
    const secret =
      process.env.PROJECT_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;

    if (!secret) {
      console.error(
        'PROJECT_TOKEN_SECRET or NEXTAUTH_SECRET environment variable is not set'
      );
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Token signing not configured' },
        { status: 500 }
      );
    }

    // Create the token payload
    const now = Math.floor(Date.now() / 1000);
    const payload: ProjectTokenPayload = {
      userId: user.id,
      projectId: project.id,
      accountId: project.account_id,
      role: membership.role as ProjectRole,
      permissions: finalPermissions,
      iat: now,
      exp: now + 30, // 30 second expiry - short-lived for handoff
    };

    // Sign the token using jose (edge-compatible)
    const secretKey = new TextEncoder().encode(secret);

    const token = await new SignJWT(payload as unknown as Record<string, unknown>)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(now + 30)
      .setSubject(user.id)
      .setIssuer('portal')
      .setAudience('pol-app')
      .sign(secretKey);

    return NextResponse.json({
      token,
      expiresIn: 30,
      projectName: project.name,
    });
  } catch (error) {
    console.error('Error generating project token:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
