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
  console.log('Fetching user account for ID:', userId);
  
  try {
    const { data, error } = await client
      .from('accounts')
      .select()
      .eq('id', userId)
      .single();
    
    console.log('User account query result:', { data, error });
      
    if (error) {
      console.error('Error fetching user account:', error);
      return null;
    }

    if (!data?.name || !data?.email) {
      console.log('Missing required user account fields:', data);
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
  console.log('Fetching members for project:', projectId);
  
  try {
    const { data: memberData, error: memberError } = await client
      .from('project_members')
      .select('*')
      .eq('project_id', projectId);

    console.log('Project members query result:', { memberData, memberError });

    if (memberError) {
      console.error('Error fetching project members:', memberError);
      return [];
    }

    if (!memberData) {
      console.log('No member data found for project:', projectId);
      return [];
    }

    console.log('Found member records:', memberData.length);
    
    const members: ProjectMember[] = [];
    const projectMembers = memberData as ProjectMemberRow[];

    for (const member of projectMembers) {
      console.log('Processing member:', member);
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
      } else {
        console.log('Could not fetch user account for member:', member.user_id);
      }
    }

    console.log('Final processed members:', members);
    return members;
  } catch (error) {
    console.error('Error in fetchProjectMembers:', error);
    return [];
  }
}

async function fetchProjects(): Promise<Project[]> {
  const client = getSupabaseServerComponentClient();
  console.log('Starting fetchProjects');
  
  try {
    // Step 1: Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    console.log('Auth getUser result:', { user, userError });
    
    if (userError) {
      console.error('Error getting user:', userError);
      return [];
    }
    
    if (!user) {
      console.log('No user found');
      return [];
    }

    // Let's first try to get all projects to see if the table is accessible
    console.log('Testing projects table access...');
    const { data: allProjects, error: allProjectsError } = await client
      .from('projects')
      .select('*')
      .limit(1);

    console.log('Projects table test query result:', { allProjects, allProjectsError });

    // Step 2: Get project memberships
    console.log('Fetching project memberships for user:', user.id);
    const { data: memberData, error: memberError } = await client
      .from('project_members')
      .select('*')
      .eq('user_id', user.id);

    console.log('Project memberships query result:', { memberData, memberError });

    if (memberError) {
      console.error('Error fetching project memberships:', memberError);
      return [];
    }

    if (!memberData || memberData.length === 0) {
      console.log('No project memberships found');
      return [];
    }

    const userProjects = memberData as ProjectMemberRow[];

    // Step 3: Get project IDs
    const projectIds = userProjects.map(up => up.project_id);
    console.log('Project IDs extracted:', projectIds);

    // Step 4: Get projects
    console.log('Fetching projects with IDs:', projectIds);
    const { data: rawProjects, error: projectsError } = await client
      .from('projects')
      .select('*')
      .in('id', projectIds);

    console.log('Projects query result:', { rawProjects, projectsError });

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return [];
    }

    if (!rawProjects) {
      console.log('No projects data returned');
      return [];
    }

    // Step 5: Process projects and fetch members
    console.log('Processing projects and fetching members');
    const projectsData = rawProjects as ProjectRow[];
    const projects: Project[] = await Promise.all(
      projectsData.map(async (project): Promise<Project> => {
        console.log('Processing project:', project.id);
        const members = await fetchProjectMembers(project.id);
        const project_members = members.map(m => ({
          user_id: m.user_id,
          role: m.role
        }));

        const processedProject = {
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
        
        console.log('Processed project:', processedProject);
        return processedProject;
      })
    );

    console.log('Final processed projects:', projects);
    return projects;

  } catch (error) {
    console.error('Error in fetchProjects:', error);
    return [];
  }
}

export default function ProjectsPage() {
  console.log('ProjectsPage rendering');
  const projects = use(fetchProjects());
  console.log('Projects fetched:', {
    count: projects.length,
    projects
  });
  
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