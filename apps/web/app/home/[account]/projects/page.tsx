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
    auth: {
      id: string;
      email: string;
      raw_app_meta_data: {
        role?: string;
      } | null;
      user_metadata: {
        name?: string;
        avatar_url?: string;
      } | null;
    };
  }>;
}

async function fetchProjects(): Promise<ProjectsData> {
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

    // Get the current account ID from the URL params
    // This would be passed in from the [account] dynamic route segment
    const urlParams = new URLSearchParams(window.location.search);
    const accountId = urlParams.get('accountId');

    if (!accountId) {
      throw new Error('No account ID provided');
    }

    // Verify user has access to this account if not super-admin
    if (!isSuperAdmin) {
      const { data: membership, error: membershipError } = await client
        .from('accounts_memberships')
        .select('account_role')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .single();

      if (membershipError || !membership) {
        console.error('Error fetching account membership:', membershipError);
        throw new Error('User does not have access to this account');
      }
    }

    // Build main query to get projects
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
        project_members!left (
          user_id,
          role,
          auth:users!left (
            id,
            email,
            raw_app_meta_data,
            user_metadata
          )
        )
      `);

    // Always filter by account_id to get projects for current team
    query = query.eq('account_id', accountId);

    // For non-super-admins, also filter by project membership
    if (!isSuperAdmin) {
      query = query.eq('project_members.user_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Projects found:', data?.length);

    const projects = (data as unknown as DatabaseProject[]).map(project => ({
      ...project,
      members: project.project_members.map(member => ({
        user_id: member.user_id,
        role: member.role,
        created_at: project.created_at,
        updated_at: project.updated_at,
        name: member.auth?.user_metadata?.name ?? '',
        email: member.auth?.email ?? '',
        avatar_url: member.auth?.user_metadata?.avatar_url
      }))
    }));

    // For super-admin, we don't care about the project role
    const userProjectRole = isSuperAdmin 
      ? 'admin' // Dummy role for UI purposes
      : (projects[0]?.project_members.find(
          member => member.user_id === user.id
        )?.role ?? 'member');

    return {
      projects,
      userRole: userProjectRole,
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

export default function ProjectsPage() {
  const { projects = [], userRole = 'member' } = use(fetchProjects());
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
              <Trans i18nKey="projects:createNew" />
            </EmptyStateButton>
          </CreateProjectDialog>
        </div>

        {!hasProjects ? (
          <EmptyState>
            <EmptyStateHeading>
              <Trans i18nKey="projects:emptyState.title" />
            </EmptyStateHeading>
            
            <EmptyStateText>
              <Trans i18nKey="projects:emptyState.description" />
            </EmptyStateText>
            
            <CreateProjectDialog>
              <EmptyStateButton>
                <Trans i18nKey="projects:createNew" />
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