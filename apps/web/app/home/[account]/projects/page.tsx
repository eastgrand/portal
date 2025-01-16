import { use } from 'react';
import { getSupabaseServerComponentClient } from '@kit/supabase/server-component-client';
import { Trans } from '@kit/ui/trans';
import { PageBody } from '@kit/ui/page';
import {
  EmptyState,
  EmptyStateButton,
  EmptyStateHeading,
  EmptyStateText,
} from '@kit/ui/empty-state';

import { HomeLayoutPageHeader } from '../../(user)/_components/home-page-header';
import { CreateProjectDialog } from '../_components/create-project-dialog';
import ProjectsList from '../../(user)/_components/projects-list';

type ProjectRole = 'owner' | 'admin' | 'member';

interface PageProps {
  params: {
    account: string;
  };
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
    role: ProjectRole;
  }[];
  members: {
    user_id: string;
    role: ProjectRole;
    created_at: string;
    updated_at: string;
    name: string;
    email: string;
    avatar_url?: string;
  }[];
}

interface ProjectsData {
  projects: Project[];
  userRole: ProjectRole;
  isSuperAdmin: boolean;
}

interface DatabaseProject {
  id: string;
  name: string;
  account_id: string;
  created_at: string;
  updated_at: string;
  description: string | null;
  app_url: string;
  project_members: Array<{
    user_id: string;
    role: ProjectRole;
  }>;
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

async function fetchProjectMembers(projectId: string): Promise<Project['members']> {
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

    const members: Project['members'] = [];

    for (const member of memberData) {
      const userAccount = await fetchUserAccount(member.user_id);
      
      if (userAccount) {
        members.push({
          user_id: member.user_id,
          role: member.role as ProjectRole,
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

async function fetchProjects(accountSlug: string): Promise<ProjectsData> {
  const client = getSupabaseServerComponentClient();
  
  try {
    // Get the current authenticated user
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (userError || !user) {
      console.error('Authentication error:', userError);
      throw new Error('User not authenticated');
    }

    const isSuperAdmin = user.app_metadata?.role === 'super-admin';
    console.log('Is Super Admin:', isSuperAdmin);

    // First, get the account ID from the slug
    const { data: account } = await client
      .from('accounts')
      .select('id')
      .eq('slug', accountSlug)
      .single();

    if (!account) {
      throw new Error('Account not found');
    }

    // Query to get all projects for this account
    let query = client
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
      `)
      .eq('account_id', account.id);

    // If not super-admin, also filter by project membership
    if (!isSuperAdmin) {
      query = query.eq('project_members.user_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Query result:', { accountId: account.id, projectsFound: data?.length });

    // Fetch full member details for each project
    const projectsWithMembers = await Promise.all(
      (data as unknown as DatabaseProject[]).map(async (project) => ({
        ...project,
        members: await fetchProjectMembers(project.id)
      }))
    );

    return {
      projects: projectsWithMembers,
      userRole: isSuperAdmin ? 'admin' : (projectsWithMembers[0]?.project_members?.[0]?.role ?? 'member'),
      isSuperAdmin
    };
  } catch (error) {
    console.error('Error in fetchProjects:', error);
    return {
      projects: [],
      userRole: 'member',
      isSuperAdmin: false
    };
  }
}

export default function ProjectsPage({ params }: PageProps) {
  const { projects = [], userRole = 'member' } = use(fetchProjects(params.account));
  const hasProjects = Array.isArray(projects) && projects.length > 0;

  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey="projects:projects" />}
        description={<Trans i18nKey="projects:projectsDescription" />}
      />

<PageBody>
  <div className="mb-4 flex justify-end">
    <CreateProjectDialog>
      <EmptyStateButton>
        New Project
      </EmptyStateButton>
    </CreateProjectDialog>
  </div>

  {!hasProjects ? (
    <EmptyState>
      <EmptyStateHeading>
        Projects
      </EmptyStateHeading>
      
      <EmptyStateText>
        No projects yet
      </EmptyStateText>
      
      <CreateProjectDialog>
        <EmptyStateButton>
          New Project
        </EmptyStateButton>
      </CreateProjectDialog>
    </EmptyState>
        ) : (
          <ProjectsList 
            projects={projects} 
            userRole={userRole}
          />
        )}
      </PageBody>
    </>
  );
}