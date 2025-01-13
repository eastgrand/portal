import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSupabase } from './use-supabase';

export function useSignOut() {
  const client = useSupabase();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      await client.auth.signOut();
    },
    onSuccess: () => {
      router.push('/auth/sign-in');
    },
  });
}