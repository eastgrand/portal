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
    role: 'owner' | 'admin' | 'member';
  }[];
  members: {
    user_id: string;
    role: UserRole;
    created_at: string;
    updated_at: string;
    name: string;
    email: string;
    avatar_url?: string;
  }[];
}

type UserRole = 'owner' | 'admin' | 'member';

interface ProjectsData {
  projects: Project[];
  userRole: UserRole;
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
    role: UserRole;
    auth: {
      id: string;
      email: string;
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

    // Fetch projects with members and their profiles
    const { data, error } = await client
      .from('projects')
      .select(`
        id,
        name,
        account_id,
        created_at,
        updated_at,
        description,
        app_url,
        project_members:project_members (
          user_id,
          role,
          auth:auth.users (
            id,
            email,
            user_metadata
          )
        )
      `)
      .eq('project_members.user_id', user.id);

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
        email: member.auth?.email || '',
        avatar_url: member.auth?.user_metadata?.avatar_url
      }))
    }));

    const userRole = projects[0]?.project_members[0]?.role ?? 'member';

    return {
      projects,
      userRole
    };
  } catch (error) {
    console.error('Error in fetchProjects:', error);
    return {
      projects: [],
      userRole: 'member'
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
              <Trans i18nKey="New Project" />
            </EmptyStateButton>
          </CreateProjectDialog>
        </div>

        {!hasProjects ? (
          <EmptyState>
            <EmptyStateHeading>
              <Trans i18nKey="Projects" />
            </EmptyStateHeading>
            
            <EmptyStateText>
              <Trans i18nKey="No projects yet" />
            </EmptyStateText>
            
            <CreateProjectDialog>
              <EmptyStateButton>
                <Trans i18nKey="New Project" />
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