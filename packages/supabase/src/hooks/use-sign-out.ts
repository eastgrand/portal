import { useMutation } from '@tanstack/react-query';
import { useSupabase } from './use-supabase';

export function useSignOut() {
  const client = useSupabase();

  return useMutation({
    mutationFn: async () => {
      await client.auth.signOut();
      
      // Force a full page reload to clear all state and navigate to sign-in
      window.location.href = '/auth/sign-in';
    },
  });
}