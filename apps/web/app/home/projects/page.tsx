/* eslint-disable @typescript-eslint/no-unused-vars */
import { use } from 'react';
import { headers } from 'next/headers';
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

async function fetchProjects() {
  const client = getSupabaseServerComponentClient();
  
  try {
    // Fetch all projects
    const { data, error } = await client
      .from('projects')
      .select(`
        *,
        project_members!inner(user_id)
      `)
      .eq('project_members.user_id', '163f7fdd-c4c7-4ef9-9d4c-72f98ae4151e');

    console.log('Projects fetch result:', { 
      data, 
      error,
      userId: '163f7fdd-c4c7-4ef9-9d4c-72f98ae4151e'
    });

    return data ?? [];
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

export default function ProjectsPage() {
  // Explicitly log in server component
  console.log('Projects Page Server Component Rendering');

  // Fetch projects
  const projects = use(fetchProjects());

  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey={'projects:projects'} />}
        description={<Trans i18nKey={'projects:projectsDescription'} />}
      />

      <PageBody>
        <div className="mb-4 flex justify-end">
          <Link href="/home/projects/new">
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