import { use } from 'react';
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
import { PageBody, PageHeader } from '@kit/ui/page';
import { CreateProjectDialog } from './_components/create-project-dialog';
import { createProjectsService } from './_lib/server/projects/projects.service';
import { getUserRole } from './_lib/server/users/users.service';

interface ProjectsPageProps {
 params: {
   account: string;
 };
}

export default function ProjectsPage({ params }: ProjectsPageProps) {
 const client = getSupabaseServerComponentClient();
 const service = createProjectsService(client);
 const userRole = use(getUserRole(client));
 const projects = use(service.getProjects(params.account, userRole ?? undefined));
 const canCreateProjects = userRole === 'super-admin';

 return (
   <>
     <PageHeader title="Projects" description={<AppBreadcrumbs />}>
       {canCreateProjects && (
         <Link href={`/home/${params.account}/projects/new`}>
           <CreateProjectDialog>
             <Button>New Project</Button>
           </CreateProjectDialog>
         </Link>
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
           {canCreateProjects && (
             <CreateProjectDialog>
               <EmptyStateButton>Create Project</EmptyStateButton>
             </CreateProjectDialog>
           )}
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