/* eslint-disable @typescript-eslint/no-unused-vars */
// packages/supabase/src/check-requires-mfa.ts
import type { SupabaseClient } from '@supabase/supabase-js';

const ASSURANCE_LEVEL_2 = 'aal2';

/**
 * @name checkRequiresMultiFactorAuthentication
 * @description Checks if the current session requires multi-factor authentication.
 * @param client
 */
export async function checkRequiresMultiFactorAuthentication(
  client: SupabaseClient,
) {
  try {
    const { data, error } = await client.auth.getSession();
    
    if (error || !data.session?.user) {
      return false;
    }

    // Check MFA status from user metadata
    const user = data.session.user;
    const mfaEnabled = user.app_metadata?.mfa_enabled;
    const mfaVerified = user.app_metadata?.mfa_verified;

    return mfaEnabled === true && !mfaVerified;
  } catch (error) {
    console.error('Error checking MFA status:', error);
    return false;
  }
}