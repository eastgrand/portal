import { useQuery } from '@tanstack/react-query';
import { getSupabaseServerAdminClient } from '../../../../supabase/src/clients/server-admin-client';

export function useUserRole(userId: string) {
  return useQuery({
    queryKey: ['user-role', userId],
    queryFn: async () => {
      const { data, error } = await getSupabaseServerAdminClient()
        .auth.admin.getUserById(userId);

      if (error) throw error;
      return data?.user?.role;
    },
  });
} 