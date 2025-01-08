/* eslint-disable @typescript-eslint/no-unused-vars */
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

export const metadata = {
  title: 'Projects'
};

async function loadProjects() {
  const client = getSupabaseServerComponentClient();
  const service = createProjectsService(client);
  
  const [{ data: { user } }, userRole] = await Promise.all([
    client.auth.getUser(),
    getUserRole(client)
  ]);

  if (!user) {
    return { user: null, projects: [], userRole: null };
  }

  const isSuperAdmin = userRole === 'super-admin';
  const projects = await (isSuperAdmin 
    ? service.getAllProjects()
    : service.getMemberProjects(user.id)
  );

  return { user, projects: projects || [], userRole };
}

export default withI18n(async function ProjectsPage() {
  const { user, projects, userRole } = await loadProjects();

  if (!user) {
    return (
      <EmptyState>
        <EmptyStateHeading>Not authenticated</EmptyStateHeading>
        <EmptyStateText>Please sign in to view projects</EmptyStateText>
      </EmptyState>
    );
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
        <div className="flex flex-col space-y-4">
          {!projects.length ? (
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
          ) : (
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
          )}
        </div>
      </PageBody>
    </>
  );
});