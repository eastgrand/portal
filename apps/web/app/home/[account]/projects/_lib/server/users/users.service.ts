import { SupabaseClient } from '@supabase/supabase-js';

type UserRole = 'super-admin' | 'admin' | 'member' | null;

export async function getUserRole(client: SupabaseClient): Promise<UserRole> {
  try {
    const { data: { user } } = await client.auth.getUser();
    
    if (!user) return null;

    console.log('User data:', user);
    console.log('App metadata:', user.app_metadata);
    
    // The role should be in app_metadata
    return user.app_metadata?.role as UserRole;
  } catch (error) {
    console.error('Error in getUserRole:', error);
    return null;
  }
}