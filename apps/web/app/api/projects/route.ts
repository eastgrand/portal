// app/api/projects/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseServerComponentClient } from '@kit/supabase/server-component-client';

export async function GET() {
  const client = getSupabaseServerComponentClient();
  
  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return NextResponse.json({
        projects: [],
        isSuperAdmin: false,
        projectRole: 'member',
        user: null
      });
    }

    const systemRole = (user.app_metadata as { role?: string })?.role;
    const isSuperAdmin = systemRole === 'super-admin';
    
    const { data: rawProjectsData, error: projectsError } = await client
      .from('projects')
      .select(`
        id,
        name,
        account_id,
        created_at,
        updated_at,
        description,
        app_url,
        project_members (
          user_id,
          role
        )
      `);

    if (projectsError) {
      throw projectsError;
    }

    const projectsWithMembers = await Promise.all(
      rawProjectsData.map(async (project) => {
        const { data: memberData } = await client
          .from('project_members')
          .select('user_id, role, created_at, updated_at')
          .eq('project_id', project.id);

        const members = await Promise.all(
          (memberData ?? []).map(async (member) => {
            const { data: userData } = await client
              .from('accounts')
              .select('name, email')
              .eq('id', member.user_id)
              .single();

            return {
              user_id: member.user_id,
              role: member.role,
              created_at: member.created_at,
              updated_at: member.updated_at,
              name: userData?.name ?? 'Unknown User',
              email: userData?.email ?? 'no-email',
              avatar_url: undefined
            };
          })
        );

        return {
          ...project,
          members
        };
      })
    );

    return NextResponse.json({
      projects: projectsWithMembers,
      isSuperAdmin,
      projectRole: rawProjectsData[0]?.project_members?.[0]?.role ?? 'member',
      user
    });
  } catch (error) {
    console.error('Error in projects API:', error);
    return NextResponse.error();
  }
}