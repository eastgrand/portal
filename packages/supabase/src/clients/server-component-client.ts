import { createClient } from '@supabase/supabase-js';
import { getCookie } from 'cookies-next';

export function getSupabaseServerComponentClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      storage: {
        getItem: (name: string) => getCookie(name)?.toString() ?? null,
        setItem: () => {},
        removeItem: () => {},
      },
    },
  });
}
