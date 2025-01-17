'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import type { User } from '@supabase/supabase-js';
import ProjectsList from '../(user)/_components/projects-list';

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

interface ProjectsClientProps {
  initialData: {
    projects: Project[];
    isSuperAdmin: boolean;
    projectRole: UserRole;
    user: User | null;
  };
}

export default function ProjectsClient({ initialData }: ProjectsClientProps) {
  const client = useSupabase();
  const [data, setData] = useState(initialData);

  useEffect(() => {
    const channel = client.channel('public:projects');
    
    channel
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'projects' 
      }, (_payload) => {
        // Handle real-time updates
        void fetchAndUpdateProjects();
      })
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [client]);

  async function fetchAndUpdateProjects() {
    try {
      const response = await fetch('/api/projects');
      const newData = await response.json();
      setData(newData);
    } catch (error) {
      console.error('Error updating projects:', error);
    }
  }

  return (
    <ProjectsList 
      projects={data.projects} 
      userRole={data.projectRole}
      user={data.user ?? undefined}
    />
  );
}