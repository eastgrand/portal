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

// Define the raw project data structure from the database
interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  account_id: string;
  created_at: string;
  updated_at: string;
  app_url: string;
}

interface FetchResults {
  projects: Project[];
  debugLogs: string[];
  authError?: {
    message: string;
    status: number;
  };
}

async function fetchProjects(): Promise<FetchResults> {
  const client = getSupabaseServerComponentClient();
  const debugLogs: string[] = [];
  const addLog = (msg: string) => {
    debugLogs.push(`${new Date().toISOString()} - ${msg}`);
  };
  
  try {
    // Step 1: Get current user
    addLog('Starting fetchProjects');
    const { data: { user }, error: userError } = await client.auth.getUser();
    addLog(`Auth getUser result: ${user?.id}`);
    
    if (userError) {
      const errorMessage = userError.message || 'Authentication error occurred';
      addLog(`Error getting user: ${JSON.stringify(userError)}`);
      return { 
        projects: [], 
        debugLogs,
        authError: {
          message: errorMessage,
          status: userError.status ?? 400
        }
      };
    }
    
    if (!user) {
      addLog('No user found');
      return { projects: [], debugLogs };
    }

    // Test projects table access
    addLog('Testing projects table access...');
    const { data: allProjects, error: allProjectsError } = await client
      .from('projects')
      .select('*')
      .limit(1);

    if (allProjectsError) {
      addLog(`Projects table test query error: ${JSON.stringify(allProjectsError)}`);
    } else {
      addLog(`Projects table accessible, found ${allProjects?.length ?? 0} test rows`);
    }

    // Step 2: Get project memberships
    addLog(`Fetching project memberships for user: ${user.id}`);
    const { data: memberData, error: memberError } = await client
      .from('project_members')
      .select('*')
      .eq('user_id', user.id);

    if (memberError) {
      addLog(`Error fetching project memberships: ${JSON.stringify(memberError)}`);
      return { projects: [], debugLogs };
    }

    if (!memberData || memberData.length === 0) {
      addLog('No project memberships found');
      return { projects: [], debugLogs };
    }

    addLog(`Found ${memberData.length} project memberships`);
    addLog(`Membership data: ${JSON.stringify(memberData)}`);

    // Step 3: Get project IDs
    const projectIds = memberData.map(up => up.project_id as string);
    addLog(`Project IDs: ${JSON.stringify(projectIds)}`);

    // Step 4: Get projects
    addLog(`Fetching projects with IDs: ${projectIds.join(', ')}`);
    const { data: projectsData, error: projectsError } = await client
      .from('projects')
      .select('*')
      .in('id', projectIds);

    if (projectsError) {
      addLog(`Error fetching projects: ${JSON.stringify(projectsError)}`);
      return { projects: [], debugLogs };
    }

    if (!projectsData) {
      addLog('No projects data returned');
      return { projects: [], debugLogs };
    }

    addLog(`Found ${projectsData.length} projects`);

    // Step 5: Process projects
    const projects = (projectsData as ProjectData[]).map((project): Project => ({
      id: project.id,
      name: project.name,
      description: project.description?.toString() ?? null,
      account_id: project.account_id,
      created_at: project.created_at,
      updated_at: project.updated_at,
      app_url: project.app_url,
      members: [],  // Simplified for debugging
      project_members: []  // Simplified for debugging
    }));

    addLog(`Processed ${projects.length} projects successfully`);
    return { projects, debugLogs };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addLog(`Error in fetchProjects: ${errorMessage}`);
    return { projects: [], debugLogs };
  }
}

export default function ProjectsPage() {
  console.log('ProjectsPage rendering');
  const { projects, debugLogs, authError } = use(fetchProjects());
  
  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] w-full">
        <div className="text-center max-w-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Please sign in to view your projects.
          </p>
          <a
            href="/auth/signin"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-full w-full bg-gray-50">
      <div className="px-8 py-2 text-sm text-gray-500">
        Debug: {projects.length} projects found
      </div>
      
      {/* Debug Panel */}
      <div className="px-8 py-2 mb-4">
        <details className="bg-gray-100 p-4 rounded-lg">
          <summary className="text-sm font-medium text-gray-700 cursor-pointer">
            Debug Logs ({debugLogs.length})
          </summary>
          <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">
            {debugLogs.join('\n')}
          </pre>
        </details>
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