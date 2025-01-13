import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSupabase } from './use-supabase';

export function useSignOut() {
  const client = useSupabase();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      // First, sign out from Supabase
      await client.auth.signOut();
      
      // Clear any cached query data
      window?.localStorage?.removeItem('supabase.auth.token');
      window?.sessionStorage?.removeItem('supabase.auth.token');
      
      // Clear any cookies
      document.cookie.split(';').forEach(cookie => {
        document.cookie = cookie
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });

      // Small delay to ensure session is cleared
      await new Promise(resolve => setTimeout(resolve, 100));
    },
    onSuccess: () => {
      // Use replace instead of push and include timestamp to prevent caching
      const timestamp = new Date().getTime();
      router.replace(`/auth/sign-in?t=${timestamp}`);
    },
  });
}