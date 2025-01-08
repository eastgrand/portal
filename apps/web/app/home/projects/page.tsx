import { Trans } from '@kit/ui/trans';
import { PageBody } from '@kit/ui/page';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadUserWorkspace } from '../(user)/_lib/server/load-user-workspace';

// Import the home page header or create a similar component
import { HomeLayoutPageHeader } from '../(user)/_components/home-page-header';

// Existing projects imports
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
import { createProjectsService } from '../[account]/projects/_lib/server/projects/projects.service';
import { CreateProjectDialog } from '../[account]/projects/_components/create-project-dialog';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('projects:projectsPage');

  return {
    title,
  };
};

function ProjectsPage({ params }: { params: { account: string } }) {
  const client = getSupabaseServerComponentClient();
  
  // Fetch the workspace to get user information
  const workspace = use(loadUserWorkspace());
  
  // Determine the user role based on the user object
  // Adjust this logic based on how user roles are determined in your application
  const userRole = workspace.user.role ?? 'member';

  // Create projects service with the client only
  const service = createProjectsService(client);
  
  // Fetch projects for the specific account
  const projects = use(service.getProjects(params.account, userRole));

  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey={'projects:projects'} />}
        description={<Trans i18nKey={'projects:projectsDescription'} />}
      />

      <PageBody>
        <div className="mb-4 flex justify-end">
          <Link href={`/home/${params.account}/projects/new`}>
            <CreateProjectDialog>
              <Button>New Project</Button>
            </CreateProjectDialog>
          </Link>
        </div>

        <If condition={projects.length === 0}>
          <EmptyState>
            <EmptyStateHeading>No projects found</EmptyStateHeading>
            <EmptyStateText>
              You still have not created any projects. Create your first project
              now!
            </EmptyStateText>
            <CreateProjectDialog>
              <EmptyStateButton>Create Project</EmptyStateButton>
            </CreateProjectDialog>
          </EmptyState>
        </If>

        <div className={'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'}>
          {projects.map((project) => (
            <CardButton key={project.id} asChild>
              <Link href={`/home/${params.account}/projects/${project.id}`}>
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