/* eslint-disable @typescript-eslint/no-unsafe-call */
import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { createProjectsService } from '../[account]/projects/_lib/server/projects/projects.service';
import { getUserRole } from '../[account]/projects/_lib/server/users/users.service';

export async function GET() {
  try {
    const client = getSupabaseServerClient();
    const service = createProjectsService(client);
    
    const [{ data: { user } }, userRole] = await Promise.all([
      client.auth.getUser(),
      getUserRole(client)
    ]);

    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
      });
    }

    const isSuperAdmin = userRole === 'super-admin';
    const projects = await (isSuperAdmin 
      ? service.getAllProjects()
      : service.getMemberProjects(user.id)
    );

    return NextResponse.json({ projects, userRole });
  } catch (error) {
    console.error('Error in projects API:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
}