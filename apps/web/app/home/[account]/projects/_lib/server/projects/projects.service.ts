import { SupabaseClient } from '@supabase/supabase-js';

interface Project {
  id: string;
  name: string;
  account_id: string;
  created_at: string;
}

export function createProjectsService(client: SupabaseClient) {
  return {
    async getProjects(accountSlug: string, userRole: string | null | undefined): Promise<Project[]> {
      if (!accountSlug) {
        throw new Error('Account slug is required');
      }

      try {
        const { data: account, error: accountError } = await client
          .from('accounts')
          .select('id')
          .eq('slug', accountSlug)
          .single();

        if (accountError) throw accountError;
        if (!account) throw new Error('Account not found');

        // Super admin sees all projects
        if (userRole === 'super_admin') {
          const { data, error } = await client
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;
          return data || [];
        }

        // Team accounts see owned projects
        if (accountSlug.startsWith('team_')) {
          const { data, error } = await client
            .from('projects')
            .select('*')
            .eq('account_id', account.id)
            .eq('owner_id', account.id)
            .order('created_at', { ascending: false });

          if (error) throw error;
          return data || [];
        }

        // Personal accounts see member projects
        const { data, error } = await client
          .from('project_members')
          .select('project:projects(*)')
          .eq('user_id', account.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return (data?.map(item => (item.project as unknown) as Project) || []);
      } catch (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
    },

    async getAllProjects(): Promise<Project[]> {
      const { data, error } = await client
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async getMemberProjects(userId: string | undefined): Promise<Project[]> {
      if (!userId) return [];

      const { data, error } = await client
        .from('project_members')
        .select('project:projects(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data?.map(item => (item.project as unknown) as Project) || []);
    }
  };
}