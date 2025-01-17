/* eslint-disable @typescript-eslint/no-unused-vars */
import { use } from 'react';
import { getSupabaseServerComponentClient } from '@kit/supabase/server-component-client';
import { HomeLayoutPageHeader } from '../(user)/_components/home-page-header';
import ProjectsList from '../(user)/_components/projects-list';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

type ProjectRole = 'owner' | 'admin' | 'member';

interface PageProps {
  params: {
    account: string;
  };
}

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
    role: ProjectRole;
  }[];
  members: ProjectMember[];
}

interface ProjectMember {
  user_id: string;
  role: ProjectRole;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  avatar_url?: string;
}

async function fetchProjects(accountSlug: string) {
  const client = getSupabaseServerComponentClient();
  
  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return { projects: [], userRole: 'member' as const };
    }

    // Get the account ID from the slug
    const { data: account } = await client
      .from('accounts')
      .select('id')
      .eq('slug', accountSlug)
      .single();

    if (!account) {
      return { projects: [], userRole: 'member' as const };
    }

    const { data: projectsData } = await client
      .from('projects')
      .select(`
        id,
        name,
        account_id,
        created_at,
        updated_at,
        description,
        app_url,
        project_members (
          user_id,
          role
        )
      `)
      .eq('account_id', account.id);

    if (!projectsData) {
      return { projects: [], userRole: 'member' as const };
    }

    const projectsWithMembers = await Promise.all(
      projectsData.map(async (project) => {
        const { data: memberData } = await client
          .from('project_members')
          .select('user_id, role, created_at, updated_at')
          .eq('project_id', project.id);

        const members = await Promise.all(
          (memberData ?? []).map(async (member) => {
            const { data: userData } = await client
              .from('accounts')
              .select('name, email')
              .eq('id', member.user_id)
              .single();

            return {
              user_id: member.user_id,
              role: member.role as ProjectRole,
              created_at: member.created_at,
              updated_at: member.updated_at,
              name: userData?.name ?? 'Unknown User',
              email: userData?.email ?? 'no-email',
              avatar_url: undefined
            };
          })
        );

        return {
          ...project,
          members
        };
      })
    );

    const userRole = projectsData[0]?.project_members?.find(
      member => member.user_id === user.id
    )?.role ?? 'member';

    return { projects: projectsWithMembers, userRole };
  } catch (error) {
    console.error('Error fetching projects:', error);
    return { projects: [], userRole: 'member' as const };
  }
}

export default function ProjectsPage({ params }: PageProps) {
  const { projects = [], userRole = 'member' } = use(fetchProjects(params.account));
  const hasProjects = projects.length > 0;

  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey="projects:projects" />}
        description={<Trans i18nKey="projects:projectsDescription" />}
      />

      <PageBody>
        {!hasProjects ? (
          <div>No projects yet.</div>
        ) : (
          <ProjectsList 
            projects={projects} 
            userRole={userRole}
          />
        )}
      </PageBody>
    </>
  );
}