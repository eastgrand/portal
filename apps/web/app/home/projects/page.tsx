// app/home/projects/page.tsx
import { use } from 'react';
import { getSupabaseServerComponentClient } from '@kit/supabase/server-component-client';
import { Trans } from '@kit/ui/trans';
import { PageBody } from '@kit/ui/page';
import { HomeLayoutPageHeader } from '../(user)/_components/home-page-header';
import ProjectsList from '../(user)/_components/projects-list';
import type { User } from '@supabase/supabase-js';

type ProjectRole = 'owner' | 'admin' | 'member';

interface ExtendedUser extends User {
  raw_user_meta_data?: {
    role?: string;
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

interface AccountData {
  label: string;
  value: string;
  image: string | null;
}

interface AccountRow {
  account: {
    name: string;
    slug: string;
    picture_url: string | null;
  } | null;
}

// Dummy type to satisfy eslint and provide type information
type _Database = {
  public: {
    Tables: {
      account_users: {
        Row: AccountRow;
      };
    };
  };
};

// Temporary interface to match ProjectsList component props
interface _ProjectsListProps {
  projects: Project[];
  userRole: 'admin' | 'member';
  user?: ExtendedUser;
  accounts?: AccountData[];
}

async function fetchPersonalProjects() {
  const client = getSupabaseServerComponentClient();
  
  try {
    const { data: authData, error: userError } = await client.auth.getUser();
    
    console.log('Full Auth Data:', JSON.stringify(authData, null, 2));
    console.log('User Error:', userError);

    if (userError || !authData.user) {
      console.error('Auth error:', userError);
      return { 
        projects: [] as Project[], 
        userRole: 'member' as const, 
        user: null, 
        accounts: [] as AccountData[] 
      };
    }

    // Fetch raw user metadata directly from the auth.users table
    const { data: userMetadataData, error: metadataError } = await client
      .from('auth.users')
      .select('raw_user_meta_data')
      .eq('id', authData.user.id)
      .single();

    console.log('User Metadata:', JSON.stringify(userMetadataData, null, 2));
    console.log('Metadata Error:', metadataError);

    // Determine user role from metadata or default
    const userRole = userMetadataData?.raw_user_meta_data?.role ?? 
                     authData.user.app_metadata?.role ?? 
                     'member';
    const isSuperAdmin = userRole === 'super-admin';

    // Create extended user with metadata
    const extendedUser: ExtendedUser = {
      ...authData.user,
      raw_user_meta_data: {
        role: userRole
      }
    };

    // Get personal projects
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
      .eq('project_members.user_id', authData.user.id);

    console.log('Projects Data:', JSON.stringify(projectsData, null, 2));
    console.log('Projects Error:', projectsError);

    if (projectsError) {
      throw new Error(`Failed to fetch projects: ${projectsError.message}`);
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

    // Get all accounts for the user for the account selector
    const { data: accountsData } = await client
      .from('account_users')
      .select(`
        account:account_id (
          name,
          slug,
          picture_url
        )
      `)
      .eq('user_id', authData.user.id);

    console.log('Accounts Data:', JSON.stringify(accountsData, null, 2));

    const accounts: AccountData[] = (accountsData as AccountRow[] | null)?.map(row => ({
      label: row.account?.name ?? '',
      value: row.account?.slug ?? '',
      image: row.account?.picture_url ?? null
    })) ?? [];

    return { 
      projects: projectsWithMembers,
      userRole: isSuperAdmin ? 'admin' as const : 'member' as const,
      user: extendedUser,
      accounts
    };
  } catch (error) {
    console.error('Unexpected error in fetchPersonalProjects:', error);
    return { 
      projects: [] as Project[], 
      userRole: 'member' as const,
      user: null,
      accounts: [] as AccountData[]
    };
  }
}

export default function ProjectsPage() {
  console.log('ProjectsPage rendering');
  const data = use(fetchPersonalProjects());
  console.log('ProjectsPage data:', JSON.stringify(data, null, 2));

  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey="projects:projects" />}
        description={<Trans i18nKey="projects:projectsDescription" />}
      />

      <PageBody>
        <ProjectsList 
          projects={data.projects}
          userRole={data.userRole}
          user={data.user ?? undefined}
          accounts={data.accounts}
        />
      </PageBody>
    </>
  );
}