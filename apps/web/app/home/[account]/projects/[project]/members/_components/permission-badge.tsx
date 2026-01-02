'use client';

import React, { useMemo } from 'react';
import { Badge } from '@kit/ui/badge';
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';

import {
  FeaturePermission,
  detectTemplate,
  PERMISSION_TEMPLATE_METADATA,
  PermissionTemplateName,
} from '~/lib/permissions/types';

interface PermissionBadgeProps {
  permissions: FeaturePermission[];
  size?: 'sm' | 'default';
  showIcon?: boolean;
}

/**
 * Permission Badge Component
 *
 * Displays a user's permission summary as a compact badge.
 * Shows the template name (e.g., "Full Access") or "Custom (X permissions)".
 */
export function PermissionBadge({
  permissions,
  size = 'default',
  showIcon = true,
}: PermissionBadgeProps) {
  const { templateName, displayText, variant } = useMemo(() => {
    const detected = detectTemplate(permissions);

    if (detected === 'custom') {
      return {
        templateName: 'custom' as const,
        displayText: `Custom (${permissions.length})`,
        variant: 'secondary' as const,
      };
    }

    const metadata = PERMISSION_TEMPLATE_METADATA[detected];
    return {
      templateName: detected,
      displayText: metadata.name,
      variant: getVariantForTemplate(detected),
    };
  }, [permissions]);

  const Icon = getIconForTemplate(templateName);

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-0.5';

  return (
    <Badge variant={variant} className={`${sizeClasses} font-medium`}>
      {showIcon && Icon && <Icon className={size === 'sm' ? 'h-3 w-3 mr-1' : 'h-3.5 w-3.5 mr-1.5'} />}
      {displayText}
    </Badge>
  );
}

/**
 * Get the appropriate badge variant for a template
 */
function getVariantForTemplate(
  template: Exclude<PermissionTemplateName, 'custom'>
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (template) {
    case 'fullAccess':
      return 'default';
    case 'dataAnalyst':
      return 'secondary';
    case 'fieldCoordinator':
      return 'secondary';
    case 'reportViewer':
      return 'outline';
    case 'exportOnly':
      return 'outline';
    default:
      return 'secondary';
  }
}

/**
 * Get the appropriate icon component for a template
 */
function getIconForTemplate(
  template: PermissionTemplateName
): React.ComponentType<{ className?: string }> | null {
  switch (template) {
    case 'fullAccess':
      return ShieldCheck;
    case 'dataAnalyst':
    case 'fieldCoordinator':
      return Shield;
    case 'reportViewer':
    case 'exportOnly':
      return Shield;
    case 'custom':
      return ShieldAlert;
    default:
      return Shield;
  }
}

export default PermissionBadge;
