import { SupabaseClient } from '@supabase/supabase-js';

type UserRole = 'super_admin' | 'admin' | 'member' | null;

export async function getUserRole(client: SupabaseClient): Promise<UserRole> {
  try {
    const { data: { user } } = await client.auth.getUser();
    
    if (!user) return null;

    const { data: userRole, error } = await client
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    
    return userRole?.role as UserRole;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
} 