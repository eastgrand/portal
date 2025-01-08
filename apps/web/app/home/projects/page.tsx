/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { use } from 'react';
import Link from 'next/link';
import { getSupabaseServerComponentClient } from '@kit/supabase/server-component-client';
import { Button } from '@kit/ui/button';
import {
  CardButton,
  CardButtonHeader,
  CardButtonTitle,
} from '@kit/ui/card-button';
import {
  EmptyState,
  EmptyStateButton,
  EmptyStateHeading,
  EmptyStateText,
} from '@kit/ui/empty-state';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';
import { PageBody } from '@kit/ui/page';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

// Import the home page header
import { HomeLayoutPageHeader } from '../(user)/_components/home-page-header';

import { createProjectsService } from '../[account]/projects/_lib/server/projects/projects.service';
import { CreateProjectDialog } from '../[account]/projects/_components/create-project-dialog';
import { loadUserWorkspace } from '../(user)/_lib/server/load-user-workspace';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('projects:projectsPage');

  return {
    title,
  };
};

async function fetchProjects(userId: string, userRole: string | null | undefined) {
  const client = getSupabaseServerComponentClient();
  const service = createProjectsService(client);
  
  try {
    console.log('Fetching projects for:', { userId, userRole });

    // For super admin, fetch all projects
    if (userRole === 'super_admin') {
      const { data, error } = await client
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Super admin projects:', { data, error });

      return data ?? [];
    }

    // For other roles, fetch member projects
    const { data, error } = await client
      .from('project_members')
      .select('project:projects(*)')
      .eq('user_id', userId)
      .order('project.created_at', { ascending: false });

    console.log('Member projects:', { data, error });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data?.map(item => (item.project as unknown) as any) ?? []);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

function ProjectsPage() {
  // Load workspace to get user information
  const workspace = use(loadUserWorkspace());
  
  console.log('Workspace details:', {
    userId: workspace.user?.id,
    userRole: workspace.user?.role,
    userEmail: workspace.user?.email
  });

  // Fetch projects using user ID and role
  const projects = use(fetchProjects(
    workspace.user.id, 
    workspace.user?.role
  ));

  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey={'projects:projects'} />}
        description={<Trans i18nKey={'projects:projectsDescription'} />}
      />

      <PageBody>
        <div className="mb-4 flex justify-end">
          <Link href={`/home/projects/new`}>
            <CreateProjectDialog>
              <Button>New Project</Button>
            </CreateProjectDialog>
          </Link>
        </div>

        <If condition={projects.length === 0}>
          <EmptyState>
            <EmptyStateHeading>No projects found</EmptyStateHeading>
            <EmptyStateText>
              You are not a member of any projects yet. Create your first project
              or wait for an invitation!
            </EmptyStateText>
            <CreateProjectDialog>
              <EmptyStateButton>Create Project</EmptyStateButton>
            </CreateProjectDialog>
          </EmptyState>
        </If>

        <div className={'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'}>
          {projects.map((project) => (
            <CardButton key={project.id} asChild>
              <Link href={`/home/projects/${project.id}`}>
                <CardButtonHeader>
                  <CardButtonTitle>{project.name}</CardButtonTitle>
                </CardButtonHeader>
              </Link>
            </CardButton>
          ))}
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(ProjectsPage);