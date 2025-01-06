import { SupabaseClient } from '@supabase/supabase-js';

type Database = {
  public: {
    Tables: Record<string, unknown>;
  };
  auth: {
    Tables: {
      users: {
        Row: {
          id: string;
          app_metadata?: {
            mfa_enabled?: boolean;
            requires_mfa?: boolean;
            role?: string;
          };
        };
      };
    };
  };
};

type EdgeSupabaseClient = SupabaseClient<Database>;

/**
 * Checks if the current user requires MFA verification
 * Edge-compatible version
 */
export async function checkRequiresMultiFactorAuthentication(
  client: EdgeSupabaseClient,
): Promise<boolean> {
  try {
    const { data: { user }, error } = await client.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      return false;
    }

    // Check if MFA is enabled and required based on user metadata
    const hasMfaEnabled = user.app_metadata?.mfa_enabled === true;
    const requiresMfa = user.app_metadata?.requires_mfa === true;

    return hasMfaEnabled && requiresMfa;
  } catch (error) {
    console.error('Error checking MFA status:', error);
    return false;
  }
}