import { Suspense } from 'react';
import Link from 'next/link';
import { getSupabaseServerComponentClient } from '@kit/supabase/server-component-client';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
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
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { HomeLayoutPageHeader } from '../(user)/_components/home-page-header';
import { CreateProjectDialog } from '../[account]/projects/_components/create-project-dialog';
import { createProjectsService } from '../[account]/projects/_lib/server/projects/projects.service';
import { getUserRole } from '../[account]/projects/_lib/server/users/users.service';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('account:projectsPage');

  return {
    title,
  };
};

async function ProjectsList() {
  const client = getSupabaseServerComponentClient();
  const service = createProjectsService(client);
  
  const [{ data: { user } }, userRole] = await Promise.all([
    client.auth.getUser(),
    getUserRole(client)
  ]);
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const isSuperAdmin = userRole === 'super-admin';
  const projects = await (isSuperAdmin 
    ? service.getAllProjects()
    : service.getMemberProjects(user?.id)
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <If condition={!projects || projects.length === 0}>
        <EmptyState>
          <EmptyStateHeading>No projects found</EmptyStateHeading>
          <EmptyStateText>
            {isSuperAdmin 
              ? "You haven't created any projects yet. Create your first project now!"
              : "You don't have access to any projects yet."}
          </EmptyStateText>
          {isSuperAdmin && (
            <CreateProjectDialog>
              <EmptyStateButton>Create Project</EmptyStateButton>
            </CreateProjectDialog>
          )}
        </EmptyState>
      </If>
      {projects?.map((project) => (
        <CardButton key={project.id} asChild>
          <Link href={`/projects/${project.id}`}>
            <CardButtonHeader>
              <CardButtonTitle>{project.name}</CardButtonTitle>
            </CardButtonHeader>
          </Link>
        </CardButton>
      ))}
    </div>
  );
}

export default withI18n(async function ProjectsPage() {
  const client = getSupabaseServerComponentClient();
  const [{ data: { user } }, userRole] = await Promise.all([
    client.auth.getUser(),
    getUserRole(client)
  ]);
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const isSuperAdmin = userRole === 'super-admin';

  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey="common:routes.projects" />}
        description={<AppBreadcrumbs />}
      >
        {isSuperAdmin && (
          <CreateProjectDialog>
            <Button type="button">New Project</Button>
          </CreateProjectDialog>
        )}
      </HomeLayoutPageHeader>
      <PageBody>
        <Suspense fallback={<div>Loading projects...</div>}>
          <ProjectsList />
        </Suspense>
      </PageBody>
    </>
  );
});