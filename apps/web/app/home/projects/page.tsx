/* eslint-disable @typescript-eslint/no-unused-vars */
import { use } from 'react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getSupabaseServerComponentClient } from '@kit/supabase/server-component-client';
import { Button } from '@kit/ui/button';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';
import { PageBody } from '@kit/ui/page';
import {
  EmptyState,
  EmptyStateButton,
  EmptyStateHeading,
  EmptyStateText,
} from '@kit/ui/empty-state';

import { HomeLayoutPageHeader } from '../(user)/_components/home-page-header';
import { CreateProjectDialog } from '../[account]/projects/_components/create-project-dialog';
import ProjectsList from '../(user)/_components/projects-list';

type UserRole = 'owner' | 'admin' | 'member' | 'super_admin';

async function fetchProjects() {
  const client = getSupabaseServerComponentClient();
  
  try {
    const { data, error } = await client
      .from('projects')
      .select(`
        *,
        project_members!inner(user_id, role)
      `)
      .eq('project_members.user_id', '163f7fdd-c4c7-4ef9-9d4c-72f98ae4151e');

    const userRole = data?.[0]?.project_members?.[0]?.role as UserRole || 'member';

    return {
      projects: data ?? [],
      userRole
    };
  } catch (error) {
    console.error('Error fetching projects:', error);
    return {
      projects: [],
      userRole: 'member' as UserRole
    };
  }
}

export default function ProjectsPage() {
  const { projects, userRole } = use(fetchProjects());

  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey={'projects:projects'} />}
        description={<Trans i18nKey={'projects:projectsDescription'} />}
      />

      <PageBody>
        <div className="mb-4 flex justify-end">
          <CreateProjectDialog>
            <Button>New Project</Button>
          </CreateProjectDialog>
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

        <If condition={projects.length > 0}>
          <ProjectsList projects={projects} userRole={userRole} />
        </If>
      </PageBody>
    </>
  );
}