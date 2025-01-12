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

import { HomeLayoutPageHeader } from '../(user)/_components/home-page-header';
//import { CreateProjectDialog } from '../[account]/projects/_components/create-project-dialog';
import ProjectsList from '../(user)/_components/projects-list';

type UserRole = 'owner' | 'admin' | 'member';

interface Project {
  id: string;
  name: string;
  account_id: string;
  created_at: string;
  updated_at: string;
  description: string | null;
  project_members: {
    user_id: string;
    role: 'owner' | 'admin' | 'member';
  }[];
}

async function fetchProjects() {
  const client = getSupabaseServerComponentClient();
  
  try {
    const { data, error } = await client
      .from('projects')
      .select(`
        id,
        name,
        account_id,
        created_at,
        updated_at,
        description,
        app_url,
        project_members!inner(user_id, role)
      `)
      .eq('project_members.user_id', '163f7fdd-c4c7-4ef9-9d4c-72f98ae4151e');

    console.log('Query result:', { data, error });
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
    <div className="flex flex-col min-h-full w-full">
      <div className="px-8 py-6">
        <h1 className="text-xl font-semibold">
          Projects
        </h1>
      </div>

      <div className="px-8 pb-8">
        <div className="bg-white rounded-lg border w-full">
          <div className="p-6">
            <ProjectsList projects={projects} userRole={userRole} />
          </div>
        </div>
      </div>
    </div>
  );
}