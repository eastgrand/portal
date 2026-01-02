import { NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/admin/users/[id]/super-admin
 * Toggle super admin status for a user using the user_roles table
 * Only accessible by super admins
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const client = getSupabaseServerClient();
  const adminClient = getSupabaseServerAdminClient();
  const { id: targetUserId } = await params;

  // Check if current user is super admin
  const { data: { user }, error: authError } = await client.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const isSuperAdmin = user.app_metadata?.role === 'super-admin';

  if (!isSuperAdmin) {
    return NextResponse.json(
      { error: 'Forbidden - Super admin access required' },
      { status: 403 }
    );
  }

  // Prevent users from modifying their own super admin status
  if (user.id === targetUserId) {
    return NextResponse.json(
      { error: 'Cannot modify your own super admin status' },
      { status: 400 }
    );
  }

  try {
    // Parse the request body
    const body = await request.json();
    const { isSuperAdmin: newStatus } = body;

    if (typeof newStatus !== 'boolean') {
      return NextResponse.json(
        { error: 'isSuperAdmin must be a boolean' },
        { status: 400 }
      );
    }

    // Check if user exists
    const { data: targetUser, error: userError } = await adminClient.auth.admin.getUserById(targetUserId);

    if (userError || !targetUser.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Upsert into user_roles table using service_role client
    const { error: upsertError } = await adminClient
      .from('user_roles')
      .upsert(
        {
          user_id: targetUserId,
          is_super_admin: newStatus,
        },
        {
          onConflict: 'user_id',
        }
      );

    if (upsertError) {
      console.error('Error upserting user role:', upsertError);
      return NextResponse.json(
        { error: 'Failed to update super admin status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: targetUserId,
      isSuperAdmin: newStatus,
    });
  } catch (error) {
    console.error('Error in super admin toggle API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/users/[id]/super-admin
 * Get the super admin status for a specific user
 * Only accessible by super admins
 */
export async function GET(request: Request, { params }: RouteParams) {
  const client = getSupabaseServerClient();
  const adminClient = getSupabaseServerAdminClient();
  const { id: targetUserId } = await params;

  // Check if current user is super admin
  const { data: { user }, error: authError } = await client.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const isSuperAdmin = user.app_metadata?.role === 'super-admin';

  if (!isSuperAdmin) {
    return NextResponse.json(
      { error: 'Forbidden - Super admin access required' },
      { status: 403 }
    );
  }

  try {
    // Check user_roles table
    const { data: userRole, error: roleError } = await adminClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', targetUserId)
      .single();

    if (roleError && roleError.code !== 'PGRST116') {
      // PGRST116 means no rows returned, which is fine
      console.error('Error fetching user role:', roleError);
      return NextResponse.json(
        { error: 'Failed to fetch user role' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      userId: targetUserId,
      isSuperAdmin: userRole?.is_super_admin || false,
    });
  } catch (error) {
    console.error('Error in get super admin status API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
