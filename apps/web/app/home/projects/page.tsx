import { use } from 'react';
import { getSupabaseServerComponentClient } from '@kit/supabase/server-component-client';
import ProjectsList from '../(user)/_components/projects-list';

type ProjectListRole = 'owner' | 'admin' | 'member';

interface Project {
  id: string;
  name: string;
  description: string | null;
  account_id: string;
  created_at: string;
  updated_at: string;
  app_url: string;
  project_members: {
    user_id: string;
    role: ProjectListRole;
  }[];
  members: ProjectMember[];
}

interface ProjectMember {
  user_id: string;
  role: ProjectListRole;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  avatar_url?: string;
}

// Database row types
type AccountRow = {
  id: string;
  name: string;
  email: string;
};

type ProjectRow = {
  id: string;
  name: string;
  description: number | string | null;
  account_id: string;
  created_at: string;
  updated_at: string;
  app_url: string;
};

type ProjectMemberRow = {
  project_id: string;
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
};

async function fetchUserAccount(userId: string): Promise<{
  name: string;
  email: string;
} | null> {
  const client = getSupabaseServerComponentClient();
  
  try {
    const { data, error } = await client
      .from('accounts')
      .select()
      .eq('id', userId)
      .single();
      
    if (error || !data?.name || !data?.email) {
      console.error('Error fetching user account:', error);
      return null;
    }

    const account = data as AccountRow;
    return {
      name: account.name,
      email: account.email
    };
  } catch (error) {
    console.error('Error in fetchUserAccount:', error);
    return null;
  }
}

async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const client = getSupabaseServerComponentClient();
  
  try {
    const { data: memberData, error: memberError } = await client
      .from('project_members')
      .select()
      .eq('project_id', projectId);

    if (memberError || !memberData) {
      console.error('Error fetching project members:', memberError);
      return [];
    }

    const members: ProjectMember[] = [];
    const projectMembers = memberData as ProjectMemberRow[];

    for (const member of projectMembers) {
      const userAccount = await fetchUserAccount(member.user_id);
      
      if (userAccount) {
        members.push({
          user_id: member.user_id,
          role: member.role as ProjectListRole,
          created_at: member.created_at,
          updated_at: member.updated_at,
          name: userAccount.name,
          email: userAccount.email,
          avatar_url: undefined
        });
      }
    }

    return members;
  } catch (error) {
    console.error('Error in fetchProjectMembers:', error);
    return [];
  }
}

async function fetchProjects(): Promise<Project[]> {
  const client = getSupabaseServerComponentClient();
  
  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      console.log('No user found');
      return [];
    }

    const { data: memberData, error: memberError } = await client
      .from('project_members')
      .select()
      .eq('user_id', user.id);

    if (memberError || !memberData) {
      console.error('Error fetching user projects:', memberError);
      return [];
    }

    const userProjects = memberData as ProjectMemberRow[];
    if (userProjects.length === 0) {
      return [];
    }

    const projectIds = userProjects.map(up => up.project_id);
    const { data: rawProjects, error: projectsError } = await client
      .from('projects')
      .select()
      .in('id', projectIds);

    if (projectsError || !rawProjects) {
      console.error('Error fetching projects:', projectsError);
      return [];
    }

    const projectsData = rawProjects as ProjectRow[];
    const projects: Project[] = await Promise.all(
      projectsData.map(async (project): Promise<Project> => {
        const members = await fetchProjectMembers(project.id);
        const project_members = members.map(m => ({
          user_id: m.user_id,
          role: m.role
        }));

        return {
          id: project.id,
          name: project.name,
          description: project.description?.toString() ?? null,
          account_id: project.account_id,
          created_at: project.created_at,
          updated_at: project.updated_at,
          app_url: project.app_url,
          members,
          project_members
        };
      })
    );

    return projects;

  } catch (error) {
    console.error('Error in fetchProjects:', error);
    return [];
  }
}

export default function ProjectsPage() {
  console.log('ProjectsPage rendering');
  const projects = use(fetchProjects());
  console.log('Projects fetched:', projects);
  
  return (
    <div className="flex flex-col min-h-full w-full bg-gray-50">
      <div className="px-8 py-2 text-sm text-gray-500">
        Debug: {projects.length} projects found
      </div>
      
      <div className="px-8 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">
            Projects
          </h1>
        </div>
      </div>

      <div className="px-8 pb-8">
        <div className="bg-white rounded-lg border">
          <div className="p-6">
            <ProjectsList 
              projects={projects}
              userRole="member"
            />
          </div>
        </div>
      </div>
    </div>
  );
}