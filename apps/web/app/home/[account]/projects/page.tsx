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

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDialogOpen(true);
    return false;
  };

  return (
    <>
      <PageHeader title="Projects" description={<AppBreadcrumbs />}>
        {canCreateProjects && (
          <div onClick={(e) => e.preventDefault()}>
            <CreateProjectDialog
              isOpen={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              trigger={
                <Button onClick={(e) => {
                  e.preventDefault();
                  setIsDialogOpen(true);
                }}>
                  New Project
                </Button>
              }
            />
          </div>
        )}
      </PageHeader>
      <PageBody>
        <If condition={projects.length === 0}>
          <EmptyState>
            <EmptyStateHeading>No projects found</EmptyStateHeading>
            <EmptyStateText>
              {canCreateProjects 
                ? "You still have not created any projects. Create your first project now!"
                : "You don't have access to any projects yet."}
            </EmptyStateText>
            <div 
              onClick={handleClick}
              onClickCapture={handleClick}
            >
              <CreateProjectDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                trigger={
                  <EmptyStateButton 
                    onClick={handleClick}
                    onClickCapture={handleClick}
                  >
                    Create Project
                  </EmptyStateButton>
                }
              />
            </div>
          </EmptyState>
        </If>
        <div className={'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'}>
          {projects.map((project) => (
            <CardButton key={project.id} asChild>
              <Link href={`/home/${params.account}/projects/${project.id}`}>
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