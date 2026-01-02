/**
 * Permission System Types
 *
 * Shared TypeScript types for the multi-user permission system.
 * Synced from pol repo: lib/auth/types.ts
 *
 * @module lib/permissions/types
 */

// =============================================================================
// Feature Permissions
// =============================================================================

/**
 * Feature permissions matching the database enum `public.feature_permission`
 *
 * These permissions control access to specific features within the application.
 * Permissions are granted at the project level to individual users.
 */
export type FeaturePermission =
  // Core Features
  | 'view_map'
  | 'view_data'
  | 'export_data'
  | 'export_advanced'
  // Analysis Features
  | 'use_ai_assistant'
  | 'create_segments'
  | 'run_comparisons'
  // Field Operations
  | 'manage_canvassing'
  | 'view_canvassing'
  // Donor Features
  | 'view_donors'
  | 'export_donors'
  // Reports
  | 'generate_reports'
  | 'view_reports'
  // Administrative
  | 'manage_project_settings'
  | 'manage_project_members';

/**
 * All available permissions as an array (useful for iteration and validation)
 */
export const ALL_PERMISSIONS: FeaturePermission[] = [
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
  'view_reports',
  'manage_project_settings',
  'manage_project_members',
];

// =============================================================================
// Permission Templates
// =============================================================================

/**
 * Template names for quick reference
 */
export type PermissionTemplateName =
  | 'fullAccess'
  | 'dataAnalyst'
  | 'fieldCoordinator'
  | 'reportViewer'
  | 'exportOnly'
  | 'custom';

/**
 * Default permission templates matching database seed data
 *
 * These templates provide quick assignment of common permission sets.
 */
export const PERMISSION_TEMPLATES: Record<
  Exclude<PermissionTemplateName, 'custom'>,
  FeaturePermission[]
> = {
  /**
   * Full Access - All features except administrative
   * For: Campaign managers, senior staff
   */
  fullAccess: [
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
    'view_reports',
  ],

  /**
   * Data Analyst - Map, data, exports, and AI analysis
   * For: Data team members, researchers
   */
  dataAnalyst: [
    'view_map',
    'view_data',
    'export_data',
    'use_ai_assistant',
    'create_segments',
    'run_comparisons',
    'view_reports',
  ],

  /**
   * Field Coordinator - Canvassing and field operations
   * For: Field directors, volunteer coordinators
   */
  fieldCoordinator: [
    'view_map',
    'view_data',
    'manage_canvassing',
    'view_canvassing',
    'view_reports',
  ],

  /**
   * Report Viewer - Read-only reports access
   * For: Stakeholders who only need to view reports
   */
  reportViewer: ['view_reports'],

  /**
   * Export Only - Data export capabilities
   * For: External vendors, data partners
   */
  exportOnly: ['export_data', 'export_advanced', 'export_donors'],
};

/**
 * Template metadata for UI display
 */
export const PERMISSION_TEMPLATE_METADATA: Record<
  Exclude<PermissionTemplateName, 'custom'>,
  { name: string; description: string }
> = {
  fullAccess: {
    name: 'Full Access',
    description: 'Access to all features',
  },
  dataAnalyst: {
    name: 'Data Analyst',
    description: 'Map, data, exports, and AI',
  },
  fieldCoordinator: {
    name: 'Field Coordinator',
    description: 'Canvassing and field operations',
  },
  reportViewer: {
    name: 'Report Viewer',
    description: 'Read-only reports access',
  },
  exportOnly: {
    name: 'Export Only',
    description: 'Data export capabilities',
  },
};

// =============================================================================
// Permission Groups (for UI organization)
// =============================================================================

export type PermissionGroupKey =
  | 'core'
  | 'exports'
  | 'analysis'
  | 'fieldOperations'
  | 'donors'
  | 'reports'
  | 'administrative';

/**
 * Permission groups for organizing the permission editor UI
 */
export const PERMISSION_GROUPS: Record<
  PermissionGroupKey,
  { label: string; permissions: FeaturePermission[] }
> = {
  core: {
    label: 'Map & Data',
    permissions: ['view_map', 'view_data'],
  },
  exports: {
    label: 'Exports',
    permissions: ['export_data', 'export_advanced'],
  },
  analysis: {
    label: 'Analysis',
    permissions: ['use_ai_assistant', 'create_segments', 'run_comparisons'],
  },
  fieldOperations: {
    label: 'Field Operations',
    permissions: ['manage_canvassing', 'view_canvassing'],
  },
  donors: {
    label: 'Donor Access',
    permissions: ['view_donors', 'export_donors'],
  },
  reports: {
    label: 'Reports',
    permissions: ['generate_reports', 'view_reports'],
  },
  administrative: {
    label: 'Administrative',
    permissions: ['manage_project_settings', 'manage_project_members'],
  },
};

/**
 * Permission display labels for UI
 */
export const PERMISSION_LABELS: Record<FeaturePermission, string> = {
  view_map: 'View map',
  view_data: 'View data',
  export_data: 'Export data (CSV)',
  export_advanced: 'Advanced export (GeoJSON)',
  use_ai_assistant: 'AI assistant',
  create_segments: 'Create segments',
  run_comparisons: 'Run comparisons',
  manage_canvassing: 'Manage canvassing',
  view_canvassing: 'View canvassing',
  view_donors: 'View donors',
  export_donors: 'Export donors',
  generate_reports: 'Generate reports',
  view_reports: 'View reports',
  manage_project_settings: 'Project settings',
  manage_project_members: 'Manage members',
};

/**
 * Permission descriptions for tooltips/help text
 */
export const PERMISSION_DESCRIPTIONS: Record<FeaturePermission, string> = {
  view_map: 'Access to the interactive map view',
  view_data: 'Access to precinct and district data tables',
  export_data: 'Export data in standard formats (CSV)',
  export_advanced: 'Export in advanced formats (GeoJSON, Excel with geometry)',
  use_ai_assistant: 'Access to the AI-powered natural language assistant',
  create_segments: 'Create and save voter segments',
  run_comparisons: 'Compare precincts, districts, or jurisdictions',
  manage_canvassing: 'Create turfs, assign volunteers, manage field operations',
  view_canvassing: 'View canvassing progress and results (read-only)',
  view_donors: 'Access to FEC donor data and analysis',
  export_donors: 'Export donor lists and contribution data',
  generate_reports: 'Generate new PDF reports',
  view_reports: 'View existing PDF reports',
  manage_project_settings: 'Modify project configuration and defaults',
  manage_project_members: 'Add, remove, and modify team member access',
};

// =============================================================================
// Project Member Types
// =============================================================================

/**
 * Project member with permissions
 */
export interface ProjectMember {
  userId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  role: 'owner' | 'admin' | 'member';
  permissions: FeaturePermission[];
  joinedAt: Date;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Type guard to check if a string is a valid FeaturePermission
 */
export function isFeaturePermission(value: string): value is FeaturePermission {
  return ALL_PERMISSIONS.includes(value as FeaturePermission);
}

/**
 * Get permissions from a template by name
 */
export function getTemplatePermissions(
  templateName: Exclude<PermissionTemplateName, 'custom'>
): FeaturePermission[] {
  return [...PERMISSION_TEMPLATES[templateName]];
}

/**
 * Detect which template matches a set of permissions (if any)
 */
export function detectTemplate(
  permissions: FeaturePermission[]
): PermissionTemplateName {
  const sortedPerms = [...permissions].sort();

  for (const [templateName, templatePerms] of Object.entries(
    PERMISSION_TEMPLATES
  )) {
    const sortedTemplate = [...templatePerms].sort();
    if (
      sortedPerms.length === sortedTemplate.length &&
      sortedPerms.every((p, i) => p === sortedTemplate[i])
    ) {
      return templateName as PermissionTemplateName;
    }
  }

  return 'custom';
}

/**
 * Get human-readable permission count summary
 */
export function getPermissionSummary(permissions: FeaturePermission[]): string {
  const template = detectTemplate(permissions);
  if (template !== 'custom') {
    return PERMISSION_TEMPLATE_METADATA[template].name;
  }
  return `Custom (${permissions.length} permissions)`;
}
