'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect } from 'react';
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
import { PageBody, PageHeader } from '@kit/ui/page';
import { CreateProjectDialog } from './_components/create-project-dialog';
import { createProjectsService } from './_lib/server/projects/projects.service';
import { getUserRole } from './_lib/server/users/users.service';
import { NewProjectButton } from '../../(user)/_components/new-project-button';

interface ProjectsPageProps {
 params: {
   account: string;
 };
}

interface Project {
  id: string;
  name: string;
  // add other project properties as needed
}

export default function ProjectsPage({ params }: ProjectsPageProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    async function loadData() {
      // Load projects and user role here using client-side Supabase client
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*');
      setProjects(projectsData || []);
      
      // Get user role similarly
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .single();
      setUserRole(userData?.role);
    }
    
    loadData();
  }, []);

  const canCreateProjects = userRole === 'super-admin';
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    // Prevent default navigation behavior
    const handleClick = (e: MouseEvent) => {
      if (e.target instanceof HTMLElement && 
          e.target.closest('[data-test="new-project-button"]')) {
        e.preventDefault();
        e.stopPropagation();
        setIsDialogOpen(true);
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return (
    <PageBody>
      <If condition={projects.length === 0}>
        <EmptyState>
          <EmptyStateHeading>No projects found</EmptyStateHeading>
          <EmptyStateText>
            {canCreateProjects 
              ? "Create your first project now!"
              : "You don't have access to any projects yet."}
          </EmptyStateText>
          <Link href={`/home/${params.account}/projects/new`} scroll={false}>
            <EmptyStateButton>
              Create Project
            </EmptyStateButton>
          </Link>
        </EmptyState>
      </If>
      {/* Rest of your component */}
    </PageBody>
  );
}