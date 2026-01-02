import { NextResponse } from 'next/server';

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

interface RouteParams {
  params: Promise<{ projectId: string; userId: string }>;
}

/**
 * Check if the calling user can manage permissions for the target project
 * Returns true if user is:
 * - Super admin
 * - Project owner or admin
 * - Has manage_project_members permission
 */
async function canManagePermissions(
  client: ReturnType<typeof getSupabaseServerClient>,
  adminClient: ReturnType<typeof getSupabaseServerAdminClient>,
  callerUserId: string,
  projectId: string
): Promise<boolean> {
  // Check if super admin via app_metadata
  const {
    data: { user },
  } = await client.auth.getUser();
  if (user?.app_metadata?.role === 'super-admin') {
    return true;
  }

  // Check if super admin via user_roles table
  const { data: userRole } = await adminClient
    .from('user_roles')
    .select('is_super_admin')
    .eq('user_id', callerUserId)
    .single();

  if (userRole?.is_super_admin) {
    return true;
  }

  // Check project membership role
  const { data: membership } = await adminClient
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', callerUserId)
    .single();

  if (membership?.role === 'owner' || membership?.role === 'admin') {
    return true;
  }

  // Check if user has manage_project_members permission
  const { data: hasPermission } = await adminClient.rpc('has_permission', {
    target_user_id: callerUserId,
    target_project_id: projectId,
    target_permission: 'manage_project_members',
  });

  return hasPermission === true;
}

/**
 * GET /api/projects/[projectId]/permissions/[userId]
 * Fetch a user's permissions for a specific project
 */
export async function GET(request: Request, { params }: RouteParams) {
  const client = getSupabaseServerClient();
  const adminClient = getSupabaseServerAdminClient();
  const { projectId, userId: targetUserId } = await params;

  // Authenticate the caller
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check authorization - users can view their own permissions,
  // or must have permission management rights
  const isOwnPermissions = user.id === targetUserId;
  if (!isOwnPermissions) {
    const canManage = await canManagePermissions(
      client,
      adminClient,
      user.id,
      projectId
    );
    if (!canManage) {
      return NextResponse.json(
        { error: 'Forbidden - Permission management access required' },
        { status: 403 }
      );
    }
  }

  try {
    // Fetch permissions using the RPC function
    const { data: permissions, error: permError } = await adminClient.rpc(
      'get_user_permissions',
      {
        target_user_id: targetUserId,
        target_project_id: projectId,
      }
    );

    if (permError) {
      console.error('Error fetching permissions:', permError);
      return NextResponse.json(
        { error: 'Failed to fetch permissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      userId: targetUserId,
      projectId,
      permissions: permissions || [],
    });
  } catch (error) {
    console.error('Error in get permissions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[projectId]/permissions/[userId]
 * Replace all permissions for a user in a project
 * Body: { permissions: FeaturePermission[] }
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const client = getSupabaseServerClient();
  const adminClient = getSupabaseServerAdminClient();
  const { projectId, userId: targetUserId } = await params;

  // Authenticate the caller
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check authorization
  const canManage = await canManagePermissions(
    client,
    adminClient,
    user.id,
    projectId
  );
  if (!canManage) {
    return NextResponse.json(
      { error: 'Forbidden - Permission management access required' },
      { status: 403 }
    );
  }

  // Prevent users from modifying their own permissions (unless super admin)
  const isSuperAdmin =
    user.app_metadata?.role === 'super-admin' ||
    (
      await adminClient
        .from('user_roles')
        .select('is_super_admin')
        .eq('user_id', user.id)
        .single()
    ).data?.is_super_admin;

  if (user.id === targetUserId && !isSuperAdmin) {
    return NextResponse.json(
      { error: 'Cannot modify your own permissions' },
      { status: 400 }
    );
  }

  try {
    // Parse the request body
    const body = await request.json();
    const { permissions } = body as { permissions: FeaturePermission[] };

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'permissions must be an array' },
        { status: 400 }
      );
    }

    // Validate permission values
    const validPermissions: FeaturePermission[] = [
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

    const invalidPermissions = permissions.filter(
      (p) => !validPermissions.includes(p)
    );
    if (invalidPermissions.length > 0) {
      return NextResponse.json(
        { error: `Invalid permissions: ${invalidPermissions.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify target user is a member of the project
    const { data: targetMembership, error: memberError } = await adminClient
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)
      .eq('user_id', targetUserId)
      .single();

    if (memberError || !targetMembership) {
      return NextResponse.json(
        { error: 'Target user is not a member of this project' },
        { status: 404 }
      );
    }

    // Revoke all existing permissions
    const { error: revokeError } = await adminClient.rpc(
      'revoke_all_permissions',
      {
        target_user_id: targetUserId,
        target_project_id: projectId,
      }
    );

    if (revokeError) {
      console.error('Error revoking permissions:', revokeError);
      return NextResponse.json(
        { error: 'Failed to revoke existing permissions' },
        { status: 500 }
      );
    }

    // Grant new permissions
    const grantResults: { permission: string; granted: boolean }[] = [];
    for (const permission of permissions) {
      const { data: granted, error: grantError } = await adminClient.rpc(
        'grant_permission',
        {
          target_user_id: targetUserId,
          target_project_id: projectId,
          target_permission: permission,
        }
      );

      if (grantError) {
        console.error(`Error granting permission ${permission}:`, grantError);
        // Continue with other permissions but track the failure
        grantResults.push({ permission, granted: false });
      } else {
        grantResults.push({ permission, granted: granted ?? true });
      }
    }

    // Check if any grants failed
    const failedGrants = grantResults.filter((r) => !r.granted);
    if (failedGrants.length > 0 && failedGrants.length === permissions.length) {
      return NextResponse.json(
        { error: 'Failed to grant any permissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: targetUserId,
      projectId,
      permissions,
      grantResults,
    });
  } catch (error) {
    console.error('Error in update permissions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
