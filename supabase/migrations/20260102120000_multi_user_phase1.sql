-- ============================================================================
-- Migration: Multi-User Environment Phase 1
-- Description: Adds super admin functionality and extends projects table
-- Date: 2026-01-02
-- ============================================================================

-- ============================================================================
-- Section 1: User Roles Table (Super Admin functionality)
-- ============================================================================
-- We create a separate user_roles table to store additional user-level flags
-- since auth.users is managed by Supabase and shouldn't be directly modified.
-- This table extends user capabilities beyond account/team membership.

CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE public.user_roles IS 'Extended user roles for platform-wide permissions (e.g., super admin)';
COMMENT ON COLUMN public.user_roles.user_id IS 'Reference to auth.users';
COMMENT ON COLUMN public.user_roles.is_super_admin IS 'Whether the user has super admin privileges across all accounts/projects';

-- Indexes
CREATE INDEX IF NOT EXISTS ix_user_roles_is_super_admin ON public.user_roles(is_super_admin) WHERE is_super_admin = TRUE;

-- Revoke default access
REVOKE ALL ON public.user_roles FROM public, authenticated, service_role;

-- Grant read access to authenticated users (for checking own super admin status)
-- Grant full access to service_role for admin operations
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO service_role;

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
-- Users can read their own role
CREATE POLICY user_roles_read_self ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- Super admins can read all user roles
CREATE POLICY user_roles_read_all_super_admin ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = (SELECT auth.uid())
            AND ur.is_super_admin = TRUE
        )
    );

-- Only service_role can modify user_roles (admin operations go through API)
-- No INSERT/UPDATE/DELETE policies for authenticated - must use service_role

-- ============================================================================
-- Section 2: Helper Functions for Super Admin
-- ============================================================================

-- Function to check if current user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = (SELECT auth.uid())
        AND is_super_admin = TRUE
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

-- Function to check if a specific user is a super admin
CREATE OR REPLACE FUNCTION public.is_user_super_admin(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = target_user_id
        AND is_super_admin = TRUE
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_user_super_admin(UUID) TO authenticated, service_role;

-- ============================================================================
-- Section 3: Projects Table Extensions
-- ============================================================================

-- Add app_url column to projects table
-- This stores the URL of the deployed application for this project
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS app_url TEXT;

COMMENT ON COLUMN public.projects.app_url IS 'The URL of the deployed application for this project';

-- Add app_type column to projects table with default 'political'
-- This allows for different types of applications (political, climate, etc.)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS app_type TEXT DEFAULT 'political';

COMMENT ON COLUMN public.projects.app_type IS 'The type of application (political, climate, etc.)';

-- Create an index on app_type for filtering projects by type
CREATE INDEX IF NOT EXISTS ix_projects_app_type ON public.projects(app_type);

-- ============================================================================
-- Section 4: Triggers for user_roles timestamps
-- ============================================================================

-- Reuse the existing trigger function if it exists, otherwise create one
CREATE OR REPLACE FUNCTION public.trigger_set_user_roles_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_at = NOW();
        NEW.updated_at = NOW();
        NEW.created_by = (SELECT auth.uid());
        NEW.updated_by = (SELECT auth.uid());
    ELSE
        NEW.updated_at = NOW();
        NEW.updated_by = (SELECT auth.uid());
        NEW.created_at = OLD.created_at;
        NEW.created_by = OLD.created_by;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_user_roles_timestamps
    BEFORE INSERT OR UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_set_user_roles_timestamps();

-- ============================================================================
-- Section 5: Role Documentation
-- ============================================================================
--
-- ROLE MAPPING DOCUMENTATION:
--
-- Current Account Roles (public.roles table):
--   - owner (hierarchy_level: 1) - Full account control
--   - member (hierarchy_level: 2) - Basic account access
--
-- Current Project Roles (public.project_role enum):
--   - owner - Full project control
--   - admin - Project management (cannot delete project)
--   - member - View-only access
--
-- FUTURE ROLE MAPPING (for multi-tenant portal):
-- When implementing team roles, the mapping will be:
--   - owner -> team_admin (full team/account control)
--   - admin -> team_manager (team management, no billing)
--   - member -> team_member (basic access)
--
-- NOTE: The 'admin' role does not exist in public.roles yet.
-- A future migration will add it if needed. For now, the project_role
-- enum already supports admin for project-level permissions.
--
-- Super Admin (user_roles.is_super_admin):
--   - Platform-wide admin access
--   - Can manage all accounts/projects
--   - Bypasses normal RLS in admin contexts
-- ============================================================================

-- ============================================================================
-- Section 6: Super Admin RLS Extensions for Projects
-- ============================================================================

-- Allow super admins to view all projects
CREATE POLICY select_projects_super_admin ON public.projects
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin());

-- Allow super admins to update all projects
CREATE POLICY update_projects_super_admin ON public.projects
    FOR UPDATE
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Allow super admins to delete all projects
CREATE POLICY delete_projects_super_admin ON public.projects
    FOR DELETE
    TO authenticated
    USING (public.is_super_admin());

-- ============================================================================
-- Section 7: Super Admin RLS Extensions for Project Members
-- ============================================================================

-- Allow super admins to view all project members
CREATE POLICY select_project_members_super_admin ON public.project_members
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin());

-- Allow super admins to add members to any project
CREATE POLICY insert_project_members_super_admin ON public.project_members
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_super_admin());

-- Allow super admins to update any project member
CREATE POLICY update_project_members_super_admin ON public.project_members
    FOR UPDATE
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Allow super admins to remove any project member
CREATE POLICY delete_project_members_super_admin ON public.project_members
    FOR DELETE
    TO authenticated
    USING (public.is_super_admin());
