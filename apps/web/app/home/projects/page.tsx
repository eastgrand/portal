/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState } from 'react';
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
import { HomeLayoutPageHeader } from '../(user)/_components/home-page-header';
import { CreateProjectDialog } from '../[account]/projects/_components/create-project-dialog';
import { createProjectsService } from '../[account]/projects/_lib/server/projects/projects.service';
import { getUserRole } from '../[account]/projects/_lib/server/users/users.service';

export default function ProjectsPage() {
  console.log('ProjectsPage rendering');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    console.log('ProjectsPage mounted');
    async function loadData() {
      try {
        const client = getSupabaseServerComponentClient();
        const service = createProjectsService(client);
        
        // Get user and role
        const [userResponse, role] = await Promise.all([
          client.auth.getUser(),
          getUserRole(client)
        ]);

        if (!userResponse.data.user) {
          throw new Error('Not authenticated');
        }

        setUser(userResponse.data.user);
        setUserRole(role);

        // Get projects based on role
        const isSuperAdmin = role === 'super-admin';
        const projectsData = await (isSuperAdmin 
          ? service.getAllProjects()
          : service.getMemberProjects(userResponse.data.user.id)
        );

        setProjects(projectsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-4">
        <p>Loading projects...</p>
      </div>
    );
  }

  const isSuperAdmin = userRole === 'super_admin';

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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      </PageBody>
    </>
  );
}