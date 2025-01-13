/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { use } from 'react';
import { headers } from 'next/headers';
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

import { HomeLayoutPageHeader } from '../../(user)/_components/home-page-header';
import { CreateProjectDialog } from '../_components/create-project-dialog';
import ProjectsList from '../../(user)/_components/projects-list';

// Match the types from ProjectsList exactly
interface Project {
  id: string;
  name: string;
  account_id: string;
  created_at: string;
  updated_at: string;
  description: string | null;
  app_url: string;
  project_members: {
    user_id: string;
    role: 'owner' | 'admin' | 'member';
  }[];
}

type UserRole = 'owner' | 'admin' | 'member';

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

    if (error) {
      throw error;
    }

    const projects = data as unknown as Project[] ?? [];
    const userRole = projects[0]?.project_members?.[0]?.role ?? 'member';

    return {
      projects,
      userRole: userRole as UserRole
    };
  } catch (error) {
    console.error('Error fetching projects:', error);
    return {
      projects: [] as Project[],
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
            <EmptyStateButton>New Project</EmptyStateButton>
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