'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import type { User } from '@supabase/supabase-js';
import ProjectsList from '../(user)/_components/projects-list';

type UserRole = 'admin' | 'member' | 'owner';

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

export default function ProjectsPage() {
  const client = useSupabase();
  const [data, setData] = useState<{
    projects: Project[];
    projectRole: UserRole;
    user: User | null;
  }>({
    projects: [],
    projectRole: 'member',
    user: null
  });

  useEffect(() => {
    async function loadProjects() {
      try {
        const { data: { user } } = await client.auth.getUser();
        if (!user) return;

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
          `);

        if (projectsError || !projectsData) {
          console.error('Error fetching projects:', projectsError);
          return;
        }

        const projects = await Promise.all(
          projectsData.map(async (project: Omit<Project, 'members'>) => {
            const { data: memberData } = await client
              .from('project_members')
              .select('user_id, role, created_at, updated_at')
              .eq('project_id', project.id);

            const members = await Promise.all(
              (memberData ?? []).map(async (member: { 
                user_id: string; 
                role: string; 
                created_at: string; 
                updated_at: string; 
              }) => {
                const { data: userData } = await client
                  .from('accounts')
                  .select('name, email')
                  .eq('id', member.user_id)
                  .single();

                return {
                  user_id: member.user_id,
                  role: member.role as UserRole,
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

        const projectRole = projectsData[0]?.project_members?.[0]?.role ?? 'member';

        setData({ projects, projectRole, user });
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