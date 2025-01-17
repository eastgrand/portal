/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable react-hooks/rules-of-hooks */
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
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('member');

  const fetchProjectMembers = async (projectId: string) => {
    const { data: memberData } = await client
      .from('project_members')
      .select('user_id, role, created_at, updated_at')
      .eq('project_id', projectId);

    return Promise.all(
      (memberData || []).map(async (member: { 
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
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await client.auth.getUser();
        if (!user) return;
        setUser(user);

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
            project_members!inner (
              user_id,
              role
            )
          `)
          .eq('project_members.user_id', user.id);

        if (projectsData) {
          const projectsWithMembers = await Promise.all(
            projectsData.map(async (project: Omit<Project, 'members'>) => ({
              ...project,
              members: await fetchProjectMembers(project.id)
            }))
          );
          setProjects(projectsWithMembers);
          setUserRole(projectsData[0]?.project_members?.[0]?.role ?? 'member');
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [client]);

  if (loading) return <div>Loading...</div>;

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
              projects={projects} 
              userRole={userRole}
              user={user ?? undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}