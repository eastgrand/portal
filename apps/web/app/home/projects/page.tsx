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
    <div className="flex flex-col flex-1 w-full">
      <div className="flex-1">
        <div className="flex items-center justify-between py-4">
          <div className="flex flex-col">
            <div className="h-6">
              <div className="text-xs font-normal leading-none text-muted-foreground"></div>
            </div>
            <h1 className="h-6 font-heading font-bold leading-none tracking-tight dark:text-white">
              Projects
            </h1>
          </div>
        </div>

        <div className="flex w-full flex-1 flex-col">
          <div className="grid gap-4">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <input 
                    type="text" 
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 max-w-sm" 
                    placeholder="Search projects..." 
                  />
                </div>
                
                <div className="rounded-md border">
                  <div className="relative w-full overflow-auto">
                    <ProjectsList projects={projects} userRole={userRole} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}