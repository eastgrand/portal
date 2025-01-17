// app/home/projects/page.tsx
import { use } from 'react';
import { getSupabaseServerComponentClient } from '@kit/supabase/server-component-client';
import { Trans } from '@kit/ui/trans';
import { PageBody } from '@kit/ui/page';
import { HomeLayoutPageHeader } from '../(user)/_components/home-page-header';
import ProjectsList from '../(user)/_components/projects-list';

type ProjectRole = 'owner' | 'admin' | 'member';

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
  members: {
    user_id: string;
    role: ProjectRole;
    created_at: string;
    updated_at: string;
    name: string;
    email: string;
    avatar_url?: string;
  }[];
}

async function fetchPersonalProjects() {
  const client = getSupabaseServerComponentClient();
  
  try {
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return { projects: [] as Project[], userRole: 'member' as const, user: null };
    }

    // Query projects where user is a member
    const { data: projectsData, error: projectsError } = await client
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
      .eq('project_members.user_id', user.id);

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return { projects: [] as Project[], userRole: 'member' as const, user };
    }

    const projectsWithMembers = await Promise.all(
      (projectsData ?? []).map(async (project) => {
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

    const userRole = projectsData?.[0]?.project_members?.find(
      member => member.user_id === user.id
    )?.role ?? 'member';

    return { 
      projects: projectsWithMembers, 
      userRole: userRole as ProjectRole,
      user 
    };
  } catch (error) {
    console.error('Error in fetchPersonalProjects:', error);
    return { 
      projects: [] as Project[], 
      userRole: 'member' as const,
      user: null 
    };
  }
}

export default function ProjectsPage() {
  const { projects = [], userRole = 'member', user } = use(fetchPersonalProjects());

  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey="projects:projects" />}
        description={<Trans i18nKey="projects:projectsDescription" />}
      />

      <PageBody>
        <ProjectsList 
          projects={projects} 
          userRole={userRole}
          user={user ?? undefined}
        />
      </PageBody>
    </>
  );
}