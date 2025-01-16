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

    // First, get a single project to determine the account_id context
    const contextQuery = client
      .from('projects')
      .select('account_id')
      .eq('project_members.user_id', user.id)
      .limit(1)
      .single();

    const { data: contextProject, error: contextError } = await contextQuery;

    if (contextError && !isSuperAdmin) {
      console.error('Error fetching context project:', contextError);
      throw contextError;
    }

    // Build main query
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

    if (isSuperAdmin && contextProject?.account_id) {
      // For super-admin, show all projects for the current account/team
      query = query.eq('account_id', contextProject.account_id);
    } else if (!isSuperAdmin) {
      // For regular users, only show projects where they are a member
      query = query.eq('project_members.user_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

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

    // For super-admin, we don't care about project role
    const userProjectRole = isSuperAdmin 
      ? 'admin' // Default role for UI purposes only
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