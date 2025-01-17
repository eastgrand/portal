/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState } from 'react';
import { getSupabaseServerComponentClient } from '@kit/supabase/server-component-client';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import type { User } from '@supabase/supabase-js';
import ProjectsList from '../(user)/_components/projects-list';
import { PostgrestError } from '@supabase/supabase-js';

type UserRole = 'admin' | 'member';

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
    role: UserRole;
  }[];
  members: ProjectMember[];
}

interface ProjectMember {
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  avatar_url?: string;
}

// Intermediate type for raw project data from Supabase
interface RawProject {
  id: string;
  name: string;
  account_id: string;
  created_at: string;
  updated_at: string;
  description: string | null;
  app_url: string;
  project_members: {
    user_id: string;
    role: UserRole;
  }[];
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

    const members = await Promise.all(
      memberData.map(async (member) => {
        const userAccount = await fetchUserAccount(member.user_id);
        
        return {
          user_id: member.user_id,
          role: member.role as UserRole,
          created_at: member.created_at,
          updated_at: member.updated_at,
          name: userAccount?.name ?? 'Unknown User',
          email: userAccount?.email ?? 'no-email',
          avatar_url: undefined
        } as ProjectMember;
      })
    );

    return members;
  } catch (error) {
    console.error('Error in fetchProjectMembers:', error);
    return [];
  }
}

async function fetchProjects(): Promise<{
  projects: Project[];
  isSuperAdmin: boolean;
  projectRole: UserRole;
  user: User | null;
}> {
  const client = getSupabaseServerComponentClient();
  const defaultResult = {
    projects: [] as Project[],
    isSuperAdmin: false,
    projectRole: 'member' as UserRole,
    user: null
  };
  
  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return defaultResult;

    const systemRole = (user.app_metadata as { role?: string })?.role;
    const isSuperAdmin = systemRole === 'super-admin';
    
    const { data: rawProjectsData, error: projectsError } = await client
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
      `);

    if (projectsError || !rawProjectsData) {
      console.error('Error fetching projects:', projectsError);
      return { ...defaultResult, user };
    }

    const projectsWithMembers = await Promise.all(
      (rawProjectsData as RawProject[]).map(async (project) => ({
        ...project,
        members: await fetchProjectMembers(project.id)
      }))
    );

    const projectRole = rawProjectsData[0]?.project_members?.[0]?.role ?? 'member';

    return {
      projects: projectsWithMembers,
      isSuperAdmin,
      projectRole,
      user
    };
  } catch (error) {
    console.error('Error in fetchProjects:', error);
    return defaultResult;
  }
}

export default function ProjectsPage() {
  const client = useSupabase();
  const [data, setData] = useState<{
    projects: Project[];
    isSuperAdmin: boolean;
    projectRole: UserRole;
    user: User | null;
  }>({
    projects: [],
    isSuperAdmin: false,
    projectRole: 'member',
    user: null
  });

  useEffect(() => {
    async function loadProjects() {
      try {
        const projectData = await fetchProjects();
        setData(projectData);
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    }

    void loadProjects();
  }, [client]);

  return (
    <div className="flex flex-col min-h-full w-full bg-gray-50">
      <div className="px-8 py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Projects</h1>
        </div>
      </div>

      <div className="px-8 pb-8">
        <div className="bg-white rounded-lg border">
          <div className="p-6">
            <ProjectsList 
              projects={data.projects} 
              userRole={data.projectRole}
              user={data.user ?? undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}