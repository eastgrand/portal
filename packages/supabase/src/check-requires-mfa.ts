import type { SupabaseClient } from '@supabase/supabase-js';

const ASSURANCE_LEVEL_2 = 'aal2';

/**
 * @name checkRequiresMultiFactorAuthentication
 * @description Checks if the current session requires multi-factor authentication.
 * We do it by checking that the next assurance level is AAL2 and that the current assurance level is not AAL2.
 * @param client
 */
export async function checkRequiresMultiFactorAuthentication(
  client: SupabaseClient,
) {
  try {
    const { data: userData } = await client.auth.getUser();
    const userId = userData.user?.id ?? '';
    
    const { data, error } = await client.auth.admin.getUserById(userId);

    if (error || !data?.user) {
      return false;
    }

    const currentLevel = data.user.app_metadata?.mfa_verified ? ASSURANCE_LEVEL_2 : 'aal1';
    const nextLevel = data.user.app_metadata?.requires_mfa ? ASSURANCE_LEVEL_2 : currentLevel;

    return nextLevel === ASSURANCE_LEVEL_2 && nextLevel !== currentLevel;
  } catch (error) {
    console.error('Error checking MFA status:', error);
    return false;
  }
}