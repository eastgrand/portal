import { NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

/**
 * GET /api/admin/users
 * List all users with their super admin status
 * Only accessible by super admins
 */
export async function GET(request: Request) {
  const client = getSupabaseServerClient();
  const adminClient = getSupabaseServerAdminClient();

  // Check if current user is super admin (using app_metadata for existing pattern)
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

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
  const query = searchParams.get('query') || '';

  try {
    // Fetch users from auth.users via admin API
    const { data: authData, error: listError } = await adminClient.auth.admin.listUsers({
      page,
      perPage: pageSize,
    });

    if (listError) {
      console.error('Error listing users:', listError);
      return NextResponse.json(
        { error: 'Failed to list users' },
        { status: 500 }
      );
    }

    // Get user_roles from the new table
    const { data: userRoles, error: rolesError } = await adminClient
      .from('user_roles')
      .select('user_id, is_super_admin, created_at, updated_at');

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      // Continue without user_roles data - they may not exist yet
    }

    // Create a map of user_id -> is_super_admin
    const superAdminMap = new Map<string, boolean>();
    if (userRoles) {
      userRoles.forEach((role) => {
        superAdminMap.set(role.user_id, role.is_super_admin);
      });
    }

    // Merge user data with super admin status
    let users = authData.users.map((authUser) => ({
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || '',
      createdAt: authUser.created_at,
      isSuperAdmin: superAdminMap.get(authUser.id) || false,
      // Also check app_metadata for existing super admins
      isSuperAdminByMetadata: authUser.app_metadata?.role === 'super-admin',
    }));

    // Filter by query if provided
    if (query) {
      const lowerQuery = query.toLowerCase();
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(lowerQuery) ||
          u.name.toLowerCase().includes(lowerQuery)
      );
    }

    return NextResponse.json({
      users,
      page,
      pageSize,
      total: authData.users.length,
    });
  } catch (error) {
    console.error('Error in admin users API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
