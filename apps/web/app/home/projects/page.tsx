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

async function fetchProjects(account: string) {
  const client = getSupabaseServerComponentClient();
  
  // Load workspace to get user role and information
  const workspace = await loadUserWorkspace();
  
  console.log('Workspace information:', {
    userId: workspace.user?.id,
    userEmail: workspace.user?.email,
    userRole: workspace.user?.role,
    account,
    accounts: workspace.accounts
  });

  // Determine user role, defaulting to 'member' if not found
  const userRole = workspace.user?.role ?? 'member';

  const service = createProjectsService(client);
  
  try {
    // If no account is provided, try to use the user's primary account
    const accountToUse = account !== 'undefined' 
      ? account 
      : workspace.accounts?.[0]?.value ?? workspace.user?.id;

    console.log('Account to use:', accountToUse);

    // Fetch projects for the account with the user's role
    return await service.getProjects(accountToUse, userRole);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return [];
  }
}

function ProjectsPage({ params }: { params: { account: string } }) {
  console.log('Projects Page Params:', params);

  const projects = use(fetchProjects(params.account));

  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey={'projects:projects'} />}
        description={<Trans i18nKey={'projects:projectsDescription'} />}
      />

      <PageBody>
        <div className="mb-4 flex justify-end">
          <Link href={`/home/${params.account || 'undefined'}/projects/new`}>
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
              <Link href={`/home/${params.account || 'undefined'}/projects/${project.id}`}>
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