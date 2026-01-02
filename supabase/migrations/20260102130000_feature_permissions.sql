-- ============================================================================
-- Migration: Multi-User Environment Phase 2 - Feature Permissions
-- Description: Adds granular feature-level permissions for project members
-- Date: 2026-01-02
-- Depends on: 20260102120000_multi_user_phase1.sql
-- ============================================================================

-- ============================================================================
-- Section 1: Feature Permission Enum
-- ============================================================================
-- Feature permissions control access to specific features within the application.
-- Permissions are granted at the project level to individual users.

CREATE TYPE public.feature_permission AS ENUM (
    -- Core Features
    'view_map',
    'view_data',
    'export_data',
    'export_advanced',
    -- Analysis Features
    'use_ai_assistant',
    'create_segments',
    'run_comparisons',
    -- Field Operations
    'manage_canvassing',
    'view_canvassing',
    -- Donor Features
    'view_donors',
    'export_donors',
    -- Reports
    'generate_reports',
    'view_reports',
    -- Administrative
    'manage_project_settings',
    'manage_project_members'
);

COMMENT ON TYPE public.feature_permission IS 'Granular feature-level permissions for project access control';

-- ============================================================================
-- Section 2: Project Member Permissions Table
-- ============================================================================
-- Stores individual permission grants for users within a project.
-- Each row represents a single permission grant.

CREATE TABLE public.project_member_permissions (
    id BIGSERIAL PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission public.feature_permission NOT NULL,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique permission per user per project
    CONSTRAINT uq_project_member_permission UNIQUE(project_id, user_id, permission)
);

COMMENT ON TABLE public.project_member_permissions IS 'Feature-level permissions granted to users for specific projects';
COMMENT ON COLUMN public.project_member_permissions.project_id IS 'Reference to the project';
COMMENT ON COLUMN public.project_member_permissions.user_id IS 'Reference to the user (auth.users)';
COMMENT ON COLUMN public.project_member_permissions.permission IS 'The specific feature permission granted';
COMMENT ON COLUMN public.project_member_permissions.granted_by IS 'User who granted this permission';
COMMENT ON COLUMN public.project_member_permissions.granted_at IS 'When the permission was granted';

-- ============================================================================
-- Section 3: Permission Templates Table
-- ============================================================================
-- Pre-defined permission sets for quick assignment.
-- Templates can be applied to users to grant multiple permissions at once.

CREATE TABLE public.permission_templates (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    permissions public.feature_permission[] NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_permission_template_name UNIQUE(name)
);

COMMENT ON TABLE public.permission_templates IS 'Pre-defined permission sets for quick user permission assignment';
COMMENT ON COLUMN public.permission_templates.name IS 'Template name (e.g., Full Access, Data Analyst)';
COMMENT ON COLUMN public.permission_templates.description IS 'Human-readable description of the template';
COMMENT ON COLUMN public.permission_templates.permissions IS 'Array of feature permissions included in this template';
COMMENT ON COLUMN public.permission_templates.is_default IS 'Whether this is the default template for new users';

-- ============================================================================
-- Section 4: Indexes for Performance
-- ============================================================================

-- Primary lookup pattern: get all permissions for a user in a project
CREATE INDEX ix_project_member_permissions_user_project
    ON public.project_member_permissions(user_id, project_id);

-- Secondary lookup: get all users with a specific permission in a project
CREATE INDEX ix_project_member_permissions_project_permission
    ON public.project_member_permissions(project_id, permission);

-- Lookup permissions granted by a specific user
CREATE INDEX ix_project_member_permissions_granted_by
    ON public.project_member_permissions(granted_by)
    WHERE granted_by IS NOT NULL;

-- Quick lookup for default templates
CREATE INDEX ix_permission_templates_is_default
    ON public.permission_templates(is_default)
    WHERE is_default = TRUE;

-- ============================================================================
-- Section 5: Row Level Security
-- ============================================================================

-- Revoke default access
REVOKE ALL ON public.project_member_permissions FROM public, authenticated, service_role;
REVOKE ALL ON public.permission_templates FROM public, authenticated, service_role;

-- Grant appropriate access
GRANT SELECT ON public.project_member_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_member_permissions TO service_role;

GRANT SELECT ON public.permission_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permission_templates TO service_role;

-- Grant sequence access for inserts
GRANT USAGE, SELECT ON SEQUENCE public.project_member_permissions_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.permission_templates_id_seq TO service_role;

-- Enable RLS
ALTER TABLE public.project_member_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Section 5.1: RLS Policies for project_member_permissions
-- ============================================================================

-- Users can read their own permissions
CREATE POLICY pmp_read_own ON public.project_member_permissions
    FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- Project owners/admins can read all permissions for their projects
CREATE POLICY pmp_read_project_admin ON public.project_member_permissions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_member_permissions.project_id
            AND pm.user_id = (SELECT auth.uid())
            AND pm.role IN ('owner', 'admin')
        )
    );

-- Super admins can read all permissions
CREATE POLICY pmp_read_super_admin ON public.project_member_permissions
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin());

-- Project owners/admins can insert permissions for their projects
CREATE POLICY pmp_insert_project_admin ON public.project_member_permissions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_member_permissions.project_id
            AND pm.user_id = (SELECT auth.uid())
            AND pm.role IN ('owner', 'admin')
        )
    );

-- Super admins can insert any permissions
CREATE POLICY pmp_insert_super_admin ON public.project_member_permissions
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_super_admin());

-- Project owners/admins can update permissions for their projects
CREATE POLICY pmp_update_project_admin ON public.project_member_permissions
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_member_permissions.project_id
            AND pm.user_id = (SELECT auth.uid())
            AND pm.role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_member_permissions.project_id
            AND pm.user_id = (SELECT auth.uid())
            AND pm.role IN ('owner', 'admin')
        )
    );

-- Super admins can update any permissions
CREATE POLICY pmp_update_super_admin ON public.project_member_permissions
    FOR UPDATE
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Project owners/admins can delete permissions for their projects
CREATE POLICY pmp_delete_project_admin ON public.project_member_permissions
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_member_permissions.project_id
            AND pm.user_id = (SELECT auth.uid())
            AND pm.role IN ('owner', 'admin')
        )
    );

-- Super admins can delete any permissions
CREATE POLICY pmp_delete_super_admin ON public.project_member_permissions
    FOR DELETE
    TO authenticated
    USING (public.is_super_admin());

-- ============================================================================
-- Section 5.2: RLS Policies for permission_templates
-- ============================================================================

-- Everyone can read permission templates (they are reference data)
CREATE POLICY pt_read_all ON public.permission_templates
    FOR SELECT
    TO authenticated
    USING (TRUE);

-- Only super admins can modify templates (via service_role in practice)
-- No INSERT/UPDATE/DELETE policies for authenticated - must use service_role

-- ============================================================================
-- Section 6: Seed Default Permission Templates
-- ============================================================================
-- Templates match pol/lib/auth/types.ts PERMISSION_TEMPLATES

INSERT INTO public.permission_templates (name, description, permissions, is_default) VALUES
(
    'Full Access',
    'Access to all features (campaign managers, senior staff)',
    ARRAY[
        'view_map',
        'view_data',
        'export_data',
        'export_advanced',
        'use_ai_assistant',
        'create_segments',
        'run_comparisons',
        'manage_canvassing',
        'view_canvassing',
        'view_donors',
        'export_donors',
        'generate_reports',
        'view_reports'
    ]::public.feature_permission[],
    TRUE
),
(
    'Data Analyst',
    'Map, data, exports, and AI analysis (data team members, researchers)',
    ARRAY[
        'view_map',
        'view_data',
        'export_data',
        'use_ai_assistant',
        'create_segments',
        'run_comparisons',
        'view_reports'
    ]::public.feature_permission[],
    FALSE
),
(
    'Field Coordinator',
    'Canvassing and field operations (field directors, volunteer coordinators)',
    ARRAY[
        'view_map',
        'view_data',
        'manage_canvassing',
        'view_canvassing',
        'view_reports'
    ]::public.feature_permission[],
    FALSE
),
(
    'Report Viewer',
    'Read-only reports access (stakeholders)',
    ARRAY[
        'view_reports'
    ]::public.feature_permission[],
    FALSE
),
(
    'Export Only',
    'Data export capabilities (external vendors, data partners)',
    ARRAY[
        'export_data',
        'export_advanced',
        'export_donors'
    ]::public.feature_permission[],
    FALSE
);

-- ============================================================================
-- Section 7: Helper Functions
-- ============================================================================

-- Function to get all permissions for a user in a project
-- Returns an array of feature_permission values
CREATE OR REPLACE FUNCTION public.get_user_permissions(
    target_user_id UUID,
    target_project_id UUID
)
RETURNS public.feature_permission[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT COALESCE(
        ARRAY_AGG(pmp.permission ORDER BY pmp.permission),
        ARRAY[]::public.feature_permission[]
    )
    FROM public.project_member_permissions pmp
    WHERE pmp.user_id = target_user_id
    AND pmp.project_id = target_project_id;
$$;

COMMENT ON FUNCTION public.get_user_permissions(UUID, UUID) IS
    'Get all feature permissions for a user in a specific project';

GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID, UUID) TO authenticated, service_role;


-- Function to check if a user has a specific permission in a project
-- Returns TRUE if the user has the permission, FALSE otherwise
-- Super admins always return TRUE
CREATE OR REPLACE FUNCTION public.has_permission(
    target_user_id UUID,
    target_project_id UUID,
    target_permission public.feature_permission
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        -- Super admins have all permissions
        public.is_user_super_admin(target_user_id)
        OR
        -- Check for explicit permission grant
        EXISTS (
            SELECT 1 FROM public.project_member_permissions pmp
            WHERE pmp.user_id = target_user_id
            AND pmp.project_id = target_project_id
            AND pmp.permission = target_permission
        );
$$;

COMMENT ON FUNCTION public.has_permission(UUID, UUID, public.feature_permission) IS
    'Check if a user has a specific feature permission in a project (super admins always return TRUE)';

GRANT EXECUTE ON FUNCTION public.has_permission(UUID, UUID, public.feature_permission) TO authenticated, service_role;


-- Function to grant a permission to a user for a project
-- Returns TRUE if the permission was granted, FALSE if it already existed
CREATE OR REPLACE FUNCTION public.grant_permission(
    target_user_id UUID,
    target_project_id UUID,
    target_permission public.feature_permission
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.project_member_permissions (
        project_id,
        user_id,
        permission,
        granted_by,
        granted_at
    ) VALUES (
        target_project_id,
        target_user_id,
        target_permission,
        (SELECT auth.uid()),
        NOW()
    )
    ON CONFLICT (project_id, user_id, permission) DO NOTHING;

    -- Return TRUE if a row was inserted, FALSE if it already existed
    RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.grant_permission(UUID, UUID, public.feature_permission) IS
    'Grant a feature permission to a user for a project. Returns TRUE if granted, FALSE if already exists.';

GRANT EXECUTE ON FUNCTION public.grant_permission(UUID, UUID, public.feature_permission) TO authenticated, service_role;


-- Function to revoke a permission from a user for a project
-- Returns TRUE if the permission was revoked, FALSE if it didn't exist
CREATE OR REPLACE FUNCTION public.revoke_permission(
    target_user_id UUID,
    target_project_id UUID,
    target_permission public.feature_permission
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    DELETE FROM public.project_member_permissions
    WHERE project_id = target_project_id
    AND user_id = target_user_id
    AND permission = target_permission;

    -- Return TRUE if a row was deleted, FALSE if it didn't exist
    RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.revoke_permission(UUID, UUID, public.feature_permission) IS
    'Revoke a feature permission from a user for a project. Returns TRUE if revoked, FALSE if not found.';

GRANT EXECUTE ON FUNCTION public.revoke_permission(UUID, UUID, public.feature_permission) TO authenticated, service_role;


-- Function to apply a permission template to a user
-- Grants all permissions in the template, skipping any that already exist
-- Returns the number of new permissions granted
CREATE OR REPLACE FUNCTION public.apply_permission_template(
    target_user_id UUID,
    target_project_id UUID,
    template_name TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    template_permissions public.feature_permission[];
    perm public.feature_permission;
    granted_count INTEGER := 0;
BEGIN
    -- Get the permissions from the template
    SELECT pt.permissions INTO template_permissions
    FROM public.permission_templates pt
    WHERE pt.name = template_name;

    IF template_permissions IS NULL THEN
        RAISE EXCEPTION 'Permission template "%" not found', template_name;
    END IF;

    -- Grant each permission in the template
    FOREACH perm IN ARRAY template_permissions
    LOOP
        IF public.grant_permission(target_user_id, target_project_id, perm) THEN
            granted_count := granted_count + 1;
        END IF;
    END LOOP;

    RETURN granted_count;
END;
$$;

COMMENT ON FUNCTION public.apply_permission_template(UUID, UUID, TEXT) IS
    'Apply a permission template to a user for a project. Returns the number of new permissions granted.';

GRANT EXECUTE ON FUNCTION public.apply_permission_template(UUID, UUID, TEXT) TO authenticated, service_role;


-- Function to revoke all permissions from a user for a project
-- Returns the number of permissions revoked
CREATE OR REPLACE FUNCTION public.revoke_all_permissions(
    target_user_id UUID,
    target_project_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.project_member_permissions
    WHERE project_id = target_project_id
    AND user_id = target_user_id;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.revoke_all_permissions(UUID, UUID) IS
    'Revoke all feature permissions from a user for a project. Returns the number of permissions revoked.';

GRANT EXECUTE ON FUNCTION public.revoke_all_permissions(UUID, UUID) TO authenticated, service_role;


-- Function to check if a user has any of the specified permissions
-- Useful for feature group access checks
CREATE OR REPLACE FUNCTION public.has_any_permission(
    target_user_id UUID,
    target_project_id UUID,
    target_permissions public.feature_permission[]
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        -- Super admins have all permissions
        public.is_user_super_admin(target_user_id)
        OR
        -- Check for any permission in the array
        EXISTS (
            SELECT 1 FROM public.project_member_permissions pmp
            WHERE pmp.user_id = target_user_id
            AND pmp.project_id = target_project_id
            AND pmp.permission = ANY(target_permissions)
        );
$$;

COMMENT ON FUNCTION public.has_any_permission(UUID, UUID, public.feature_permission[]) IS
    'Check if a user has any of the specified permissions in a project';

GRANT EXECUTE ON FUNCTION public.has_any_permission(UUID, UUID, public.feature_permission[]) TO authenticated, service_role;


-- Function to check if a user has all of the specified permissions
-- Useful for strict permission checks
CREATE OR REPLACE FUNCTION public.has_all_permissions(
    target_user_id UUID,
    target_project_id UUID,
    target_permissions public.feature_permission[]
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        -- Super admins have all permissions
        public.is_user_super_admin(target_user_id)
        OR
        -- Check that all permissions exist
        (
            SELECT COUNT(DISTINCT pmp.permission) = ARRAY_LENGTH(target_permissions, 1)
            FROM public.project_member_permissions pmp
            WHERE pmp.user_id = target_user_id
            AND pmp.project_id = target_project_id
            AND pmp.permission = ANY(target_permissions)
        );
$$;

COMMENT ON FUNCTION public.has_all_permissions(UUID, UUID, public.feature_permission[]) IS
    'Check if a user has all of the specified permissions in a project';

GRANT EXECUTE ON FUNCTION public.has_all_permissions(UUID, UUID, public.feature_permission[]) TO authenticated, service_role;


-- ============================================================================
-- Section 8: Trigger to Auto-Grant Default Template on Project Member Create
-- ============================================================================
-- When a user is added to a project, automatically grant them the default
-- permission template. This ensures new members have baseline access.

CREATE OR REPLACE FUNCTION public.trigger_grant_default_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    default_template_name TEXT;
BEGIN
    -- Get the default template name
    SELECT pt.name INTO default_template_name
    FROM public.permission_templates pt
    WHERE pt.is_default = TRUE
    LIMIT 1;

    -- If we have a default template, apply it
    IF default_template_name IS NOT NULL THEN
        PERFORM public.apply_permission_template(
            NEW.user_id,
            NEW.project_id,
            default_template_name
        );
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_project_member_default_permissions
    AFTER INSERT ON public.project_members
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_grant_default_permissions();

COMMENT ON FUNCTION public.trigger_grant_default_permissions() IS
    'Automatically grant default permission template when a user is added to a project';

-- ============================================================================
-- Section 9: View for User Project Access Summary
-- ============================================================================
-- Convenient view that combines project membership and permissions

CREATE OR REPLACE VIEW public.user_project_access AS
SELECT
    pm.user_id,
    pm.project_id,
    pm.role AS project_role,
    p.name AS project_name,
    p.app_url,
    p.app_type,
    public.get_user_permissions(pm.user_id, pm.project_id) AS permissions,
    public.is_user_super_admin(pm.user_id) AS is_super_admin
FROM public.project_members pm
JOIN public.projects p ON p.id = pm.project_id;

COMMENT ON VIEW public.user_project_access IS
    'Summary view of user access to projects including role and permissions';

GRANT SELECT ON public.user_project_access TO authenticated, service_role;

-- ============================================================================
-- End of Migration
-- ============================================================================
