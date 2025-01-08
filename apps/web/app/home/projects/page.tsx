/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Suspense } from 'react';
import Link from 'next/link';
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
import { getSupabaseServerComponentClient } from '@kit/supabase/server-component-client';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  return { title: i18n.t('account:projectsPage') };
};

// Simple function to help with debugging
function logDebug(message: string, data?: any) {
  console.log(`[Projects Page Debug] ${message}`, data || '');
}

async function ProjectsList() {
  logDebug('Starting ProjectsList render');
  try {
    const client = getSupabaseServerComponentClient();
    const service = createProjectsService(client);
    
    const [{ data: { user } }, userRole] = await Promise.all([
      client.auth.getUser(),
      getUserRole(client)
    ]);

    logDebug('Auth data:', { user, userRole });

    if (!user) {
      logDebug('No user found');
      return (
        <EmptyState>
          <EmptyStateHeading>Not authenticated</EmptyStateHeading>
          <EmptyStateText>Please sign in to view projects</EmptyStateText>
        </EmptyState>
      );
    }

    const isSuperAdmin = userRole === 'super-admin';
    logDebug('Fetching projects for user', { isSuperAdmin, userId: user.id });

    const projects = await (isSuperAdmin 
      ? service.getAllProjects()
      : service.getMemberProjects(user.id)
    );

    logDebug('Projects loaded:', { count: projects?.length });

    if (!projects?.length) {
      return (
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
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {projects.map((project) => (
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
  } catch (error) {
    logDebug('Error in ProjectsList:', error);
    throw error;
  }
}

export default withI18n(async function ProjectsPage() {
  logDebug('Starting ProjectsPage render');
  try {
    const client = getSupabaseServerComponentClient();
    const userRole = await getUserRole(client);
    const isSuperAdmin = userRole === 'super-admin';

    logDebug('User role:', { userRole, isSuperAdmin });

    return (
      <>
        <div className="flex items-center justify-center p-4 bg-red-100">
          DEBUG: Page is rendering
        </div>
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
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              Loading projects...
            </div>
          }>
            <ProjectsList />
          </Suspense>
        </PageBody>
      </>
    );
  } catch (error) {
    logDebug('Error in ProjectsPage:', error);
    return (
      <EmptyState>
        <EmptyStateHeading>Error</EmptyStateHeading>
        <EmptyStateText>{error instanceof Error ? error.message : 'An error occurred'}</EmptyStateText>
      </EmptyState>
    );
  }
});