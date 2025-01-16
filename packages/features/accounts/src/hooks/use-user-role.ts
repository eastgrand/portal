import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../../../../supabase/src/hooks/use-supabase';

export function useUserRole(userId: string) {
  const client = useSupabase();
  
  return useQuery({
    queryKey: ['user-role', userId],
    queryFn: async () => {
      const { data: { user }, error } = await client.auth.admin.getUserById(userId);
      if (error) throw error;
      return user?.role;
    },
  });
} 