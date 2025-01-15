/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { CreateProjectDialog } from '../[account]/_components/create-project-dialog';
import { EmptyStateButton } from '@kit/ui/empty-state';
import { getUserRole } from '../[account]/projects/_lib/server/users/users.service';

// ProjectsList component roles
type ProjectListRole = 'owner' | 'admin' | 'member';

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
    role: ProjectListRole;
  }[];
  members: ProjectMember[];
}

interface ProjectMember {
  user_id: string;
  role: ProjectListRole;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  avatar_url?: string;
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
          role: member.role as ProjectListRole,
          created_at: member.created_at,
          updated_at: member.updated_at,
          name: userAccount.name,
          email: userAccount.email,
          avatar_url: undefined
        });
      } else {
        members.push({
          user_id: member.user_id,
          role: 'member',
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
  isSuperAdmin: boolean;
  projectRole: ProjectListRole;
}> {
  const client = getSupabaseServerComponentClient();
  const defaultResult = {
    projects: [] as Project[],
    isSuperAdmin: false,
    projectRole: 'member' as ProjectListRole
  };
  
  try {
    // Get system role
    const systemRole = await getUserRole(client as any);
    const isSuperAdmin = systemRole === 'super-admin';
    
    // Get current user
    const { data: { user } } = await client.auth.getUser();
    if (!user) return defaultResult;
    
    // If super-admin, fetch all projects
    if (isSuperAdmin) {
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
          project_members (
            user_id,
            role
          )
        `);

      if (projectsError || !projectsData) {
        console.error('Error fetching projects:', projectsError);
        return defaultResult;
      }

      const projectsWithMembers = await Promise.all(
        projectsData.map(async (project) => ({
          ...project,
          members: await fetchProjectMembers(project.id)
        }))
      );

      return {
        projects: projectsWithMembers,
        isSuperAdmin: true,
        projectRole: 'admin'
      };
    }

    // For non-super-admin users, fetch only their projects
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
      .eq('project_members.user_id', user.id);

    if (projectsError || !projectsData) {
      console.error('Error fetching projects:', projectsError);
      return defaultResult;
    }

    const projectRole = (projectsData[0]?.project_members?.[0]?.role ?? 'member') as ProjectListRole;
    
    const projectsWithMembers = await Promise.all(
      projectsData.map(async (project) => ({
        ...project,
        members: await fetchProjectMembers(project.id)
      }))
    );

    return {
      projects: projectsWithMembers,
      isSuperAdmin: false,
      projectRole
    };
  } catch (error) {
    console.error('Error in fetchProjects:', error);
    return defaultResult;
  }
}

export default function ProjectsPage() {
  const { projects, isSuperAdmin, projectRole } = use(fetchProjects());

  return (
    <div className="flex flex-col min-h-full w-full bg-gray-50">
      <div className="px-8 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">
            Projects
          </h1>
        </div>
      </div>

      <div className="px-8 pb-8">
        <If condition={projects.length === 0}>
          <div className="bg-white rounded-lg border">
            <div className="p-6">
              <ProjectsList 
                projects={projects} 
                userRole={isSuperAdmin ? 'admin' : projectRole} 
              />
            </div>
          </div>
        </If>

        <If condition={projects.length > 0}>
          <div className="mb-4 flex justify-end">
            <If condition={isSuperAdmin}>
              <CreateProjectDialog>
                <Button>New Project</Button>
              </CreateProjectDialog>
            </If>
          </div>
          
          <div className="bg-white rounded-lg border">
            <div className="p-6">
              <ProjectsList 
                projects={projects} 
                userRole={isSuperAdmin ? 'admin' : projectRole} 
              />
            </div>
          </div>
        </If>
      </div>
    </div>
  );
}