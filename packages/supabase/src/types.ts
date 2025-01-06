/**
 * Type representing a generic database table with standard fields
 */
type GenericTable = {
    Row: Record<string, unknown>;
    Insert: Record<string, unknown>;
    Update: Record<string, unknown>;
  };
  
  /**
   * Type for user metadata in auth system
   */
  type UserMetadata = {
    mfa_enabled?: boolean;
    requires_mfa?: boolean;
    role?: string;
  };
  
  /**
   * Database schema type definition
   */
  export type Database = {
    public: {
      Tables: Record<string, GenericTable>;
      Views: Record<string, { Row: Record<string, unknown> }>;
      Functions: Record<string, unknown>;
      Enums: Record<string, unknown>;
    };
    auth: {
      Tables: {
        users: {
          Row: {
            id: string;
            email?: string;
            app_metadata?: UserMetadata;
            user_metadata?: Record<string, unknown>;
          };
          Insert: never; // Prevent direct inserts
          Update: Partial<{
            email: string;
            app_metadata: UserMetadata;
            user_metadata: Record<string, unknown>;
          }>;
        };
      };
    };
  };