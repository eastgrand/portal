/* eslint-disable @typescript-eslint/no-floating-promises */
'use client';

import { useEffect, useState } from 'react';
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
import { HomeLayoutPageHeader } from '../(user)/_components/home-page-header';
import { CreateProjectDialog } from '../[account]/projects/_components/create-project-dialog';

interface Project {
  id: string;
  name: string;
  account_id: string;
  created_at: string;
}

export default function ProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to load projects');
        }
        
        const data = await response.json();
        setProjects(data.projects);
        setUserRole(data.userRole);
      } catch (error) {
        console.error('Error loading projects:', error);
        setError(error instanceof Error ? error.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, []);

  if (loading) {
    return (
      <div className="p-4">
        <p>Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState>
        <EmptyStateHeading>Error</EmptyStateHeading>
        <EmptyStateText>{error}</EmptyStateText>
      </EmptyState>
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