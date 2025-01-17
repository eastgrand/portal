/* eslint-disable @typescript-eslint/no-unused-vars */
// app/home/projects/page.tsx
import { Suspense } from 'react';
import ProjectsClient from './projects-client';
import { getSupabaseServerComponentClient } from '@kit/supabase/server-component-client';
import type { User } from '@supabase/supabase-js';

interface ProjectMember {
  user_id: string;
  role: 'admin' | 'member';
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface Project {
  id: string;
  name: string;
  account_id: string;
  created_at: string;
  updated_at: string;
  description: string | null;
  app_url: string;
  project_members: {
    user_id: string;
    role: 'admin' | 'member';
  }[];
  members: ProjectMember[];
}

async function fetchUserAccount(userId: string): Promise<{
  name: string;
  email: string;
} | null> {
  const client = getSupabaseServerComponentClient();
  
  const { data, error } = await client
    .from('accounts')
    .select('name, email')
    .eq('id', userId)
    .single();
    
  if (error || !data?.name || !data?.email) {
    console.error('Error fetching user account:', error);
    return null;
  }

  return {
    name: data.name,
    email: data.email
  };
}

async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const client = getSupabaseServerComponentClient();
  
  const { data: memberData, error: memberError } = await client
    .from('project_members')
    .select('user_id, role, created_at, updated_at')
    .eq('project_id', projectId);

  if (memberError || !memberData) {
    console.error('Error fetching project members:', memberError);
    return [];
  }

  const members = await Promise.all(
    memberData.map(async (member) => {
      const userAccount = await fetchUserAccount(member.user_id);
      
      return {
        user_id: member.user_id,
        role: member.role as 'admin' | 'member',
        created_at: member.created_at,
        updated_at: member.updated_at,
        name: userAccount?.name ?? 'Unknown User',
        email: userAccount?.email ?? 'no-email',
        avatar_url: undefined
      };
    })
  );

  return members;
}

async function fetchInitialData() {
  const client = getSupabaseServerComponentClient();
  const { data: { user } } = await client.auth.getUser();
  
  if (!user) {
    return {
      projects: [] as Project[],
      isSuperAdmin: false,
      projectRole: 'member' as const,
      user: null
    };
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

  if (projectsError || !rawProjectsData) {
    console.error('Error fetching projects:', projectsError);
    return {
      projects: [] as Project[],
      isSuperAdmin,
      projectRole: 'member' as const,
      user
    };
  }

  const projectsWithMembers: Project[] = await Promise.all(
    rawProjectsData.map(async (project) => ({
      ...project,
      members: await fetchProjectMembers(project.id)
    }))
  );

  return {
    projects: projectsWithMembers,
    isSuperAdmin,
    projectRole: rawProjectsData[0]?.project_members?.[0]?.role ?? 'member',
    user
  };
}

export default async function ProjectsPage() {
  const initialData = await fetchInitialData();

  return (
    <div className="flex flex-col min-h-full w-full bg-gray-50">
      <div className="px-8 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Projects</h1>
        </div>
      </div>

      <div className="px-8 pb-8">
        <div className="bg-white rounded-lg border">
          <div className="p-6">
            <Suspense fallback={<div>Loading projects...</div>}>
              <ProjectsClient initialData={initialData} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}