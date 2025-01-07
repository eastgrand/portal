import { SupabaseClient } from '@supabase/supabase-js';

// Updated type to use hyphen instead of underscore to match raw_app_metadata
type UserRole = 'super-admin' | 'admin' | 'member' | null;  // Changed from super_admin to super-admin

export async function getUserRole(client: SupabaseClient): Promise<UserRole> {
  try {
    const { data: { user } } = await client.auth.getUser();
    
    if (!user) return null;

    const { data: userData, error } = await client
      .from('auth.users')
      .select('raw_app_metadata')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    
    // Type assertion to ensure TypeScript knows this is a valid UserRole
    return userData?.raw_app_metadata?.role as UserRole;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}