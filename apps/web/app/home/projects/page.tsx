import { use } from 'react';
import { getSupabaseServerComponentClient } from '@kit/supabase/server-component-client';
import ProjectsList from '../(user)/_components/projects-list';

type ProjectListRole = 'owner' | 'admin' | 'member';

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

async function fetchUserAccount(userId: string): Promise<{
  name: string;
  email: string;
} | null> {
  const client = getSupabaseServerComponentClient();
  
  try {
    const { data, error } = await client
      .from('accounts')
      .select('name, email')
      .eq('id', userId)
      .single();
      
    if (error || !data?.name || !data?.email) {
      console.error('Error fetching user account:', error);
      return null;
    }

    return {
      name: data.name,
      email: data.email
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
      .select('user_id, role, created_at, updated_at')
      .eq('project_id', projectId);

    if (memberError || !memberData) {
      console.error('Error fetching project members:', memberError);
      return [];
    }

    const members: ProjectMember[] = [];

    for (const member of memberData) {
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

    const { data: memberProjects, error: memberError } = await client
      .from('project_members')
      .select(`
        project:projects (
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
        )
      `)
      .eq('user_id', user.id);

    if (memberError || !memberProjects) {
      console.error('Error fetching member projects:', memberError);
      return [];
    }

    // First cast to unknown, then to our expected type for safety
    const projectsData = memberProjects as unknown as Array<{
      project: {
        id: string;
        name: string;
        account_id: string;
        created_at: string;
        updated_at: string;
        description: string | null;
        app_url: string;
        project_members: {
          user_id: string;
          role: ProjectListRole;
        }[];
      } | null;
    }>;

    const validProjects = projectsData.filter(
      (item): item is typeof projectsData[number] & { project: NonNullable<typeof projectsData[number]['project']> } => 
        item.project !== null
    );

    const projects = await Promise.all(
      validProjects.map(async ({ project }): Promise<Project> => {
        const members = await fetchProjectMembers(project.id);
        return {
          ...project,
          members
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