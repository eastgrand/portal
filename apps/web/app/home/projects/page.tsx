/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { use } from 'react';
import { headers } from 'next/headers';
import { getSupabaseServerComponentClient } from '@kit/supabase/server-component-client';
import { Button } from '@kit/ui/button';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';
import { PageBody } from '@kit/ui/page';
import ProjectsList from '../(user)/_components/projects-list';

type UserRole = 'owner' | 'admin' | 'member';

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
    role: UserRole;
  }[];
  members: ProjectMember[];
}

interface ProjectMember {
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface RawProjectMember {
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
}

async function fetchUserAccount(userId: string): Promise<{
  name: string;
  email: string;
} | null> {
  const client = getSupabaseServerComponentClient();
  
  try {
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
  } catch (error) {
    console.error('Error in fetchUserAccount:', error);
    return null;
  }
}

async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const client = getSupabaseServerComponentClient();
  
  try {
    const { data: memberData, error: memberError } = await client
      .from('project_members')
      .select('user_id, role, created_at, updated_at')
      .eq('project_id', projectId);

    if (memberError || !memberData) {
      console.error('Error fetching project members:', memberError);
      return [];
    }

    const members: ProjectMember[] = [];

    for (const member of memberData) {
      const userAccount = await fetchUserAccount(member.user_id);
      
      if (userAccount) {
        members.push({
          user_id: member.user_id,
          role: member.role as UserRole,
          created_at: member.created_at,
          updated_at: member.updated_at,
          name: userAccount.name,
          email: userAccount.email,
          avatar_url: undefined
        });
      } else {
        // Include member with default values if account fetch fails
        members.push({
          user_id: member.user_id,
          role: member.role as UserRole,
          created_at: member.created_at,
          updated_at: member.updated_at,
          name: 'Unknown User',
          email: 'no-email',
          avatar_url: undefined
        });
      }
    }

    return members;
  } catch (error) {
    console.error('Error in fetchProjectMembers:', error);
    return [];
  }
}

async function fetchProjects(): Promise<{
  projects: Project[];
  userRole: UserRole;
}> {
  const client = getSupabaseServerComponentClient();
  const defaultResult = {
    projects: [] as Project[],
    userRole: 'member' as const
  };
  
  try {
    const { data: projectsData, error: projectsError } = await client
      .from('projects')
      .select(`
        id,
        name,
        account_id,
        created_at,
        updated_at,
        description,
        app_url,
        project_members!inner (
          user_id,
          role
        )
      `)
      .eq('project_members.user_id', '163f7fdd-c4c7-4ef9-9d4c-72f98ae4151e');

    if (projectsError || !projectsData) {
      console.error('Error fetching projects:', projectsError);
      return defaultResult;
    }

    const userRole = projectsData[0]?.project_members?.[0]?.role ?? defaultResult.userRole;

    const projectsWithMembers = await Promise.all(
      projectsData.map(async (project) => ({
        ...project,
        members: await fetchProjectMembers(project.id)
      }))
    );

    return {
      projects: projectsWithMembers,
      userRole
    };
  } catch (error) {
    console.error('Error in fetchProjects:', error);
    return defaultResult;
  }
}

export default function ProjectsPage() {
  const { projects, userRole } = use(fetchProjects());

  return (
    <div className="flex flex-col min-h-full w-full bg-gray-50">
      <div className="px-8 py-6">
        <h1 className="text-xl font-semibold">
          Projects
        </h1>
      </div>

      <div className="px-8 pb-8">
        <div className="bg-white rounded-lg border">
          <div className="p-6">
            <ProjectsList 
              projects={projects ?? []} 
              userRole={userRole ?? 'member'} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}