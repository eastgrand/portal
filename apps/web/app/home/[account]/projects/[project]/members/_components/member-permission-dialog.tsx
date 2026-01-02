'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@kit/ui/avatar';
import { Badge } from '@kit/ui/badge';
import { Settings } from 'lucide-react';
import { useToast } from '@kit/ui/use-toast';

import { PermissionEditor } from './permission-editor';
import { PermissionBadge } from './permission-badge';
import { FeaturePermission, ProjectMember } from '~/lib/permissions/types';

type UserRole = 'owner' | 'admin' | 'member' | 'super_admin';

interface MemberInfo {
  userId: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  role: UserRole;
}

interface MemberPermissionDialogProps {
  member: MemberInfo | ProjectMember;
  projectId: string;
  currentPermissions?: FeaturePermission[];
  onPermissionsUpdated?: (userId: string, permissions: FeaturePermission[]) => void;
  children: React.ReactNode;
}

/**
 * Member Permission Dialog Component
 *
 * Dialog wrapper for editing a project member's permissions.
 * Shows member info at top, PermissionEditor below, with Cancel/Save actions.
 */
export function MemberPermissionDialog({
  member,
  projectId,
  currentPermissions: propPermissions,
  onPermissionsUpdated,
  children,
}: MemberPermissionDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // Support both ProjectMember interface and MemberInfo interface
  const initialPermissions = propPermissions ?? ('permissions' in member ? member.permissions : []);
  const [permissions, setPermissions] = useState<FeaturePermission[]>(initialPermissions);

  // Sync permissions when dialog opens or initial permissions change
  useEffect(() => {
    if (open) {
      setPermissions(initialPermissions);
    }
  }, [open, initialPermissions]);

  // Get initials for avatar fallback
  const getInitials = (name?: string, email?: string): string => {
    if (name) {
      return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return '??';
  };

  // Format role for display
  const formatRole = (role: UserRole | string): string => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Admin';
      case 'member':
        return 'Member';
      default:
        return String(role);
    }
  };

  // Get role badge variant
  const getRoleBadgeVariant = (
    role: UserRole | string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Handle permission update from PermissionEditor
  const handlePermissionUpdate = useCallback(
    (newPermissions: FeaturePermission[]) => {
      setPermissions(newPermissions);
      if (onPermissionsUpdated) {
        onPermissionsUpdated(member.userId, newPermissions);
      }
      toast({
        title: 'Permissions saved',
        description: `Updated permissions for ${member.displayName || member.email}.`,
      });
      setOpen(false);
    },
    [member, onPermissionsUpdated, toast]
  );

  const displayName = member.displayName || member.email;
  const initials = getInitials(member.displayName, member.email);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Member Permissions
          </DialogTitle>
          <DialogDescription>
            Configure feature access for this team member. Changes take effect immediately after saving.
          </DialogDescription>
        </DialogHeader>

        {/* Member Info Section */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <Avatar className="h-12 w-12">
            <AvatarImage src={member.avatarUrl} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold truncate">{displayName}</h3>
              <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
                {formatRole(member.role)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">{member.email}</p>
          </div>
          <div className="flex-shrink-0">
            <PermissionBadge permissions={permissions} size="sm" />
          </div>
        </div>

        {/* Permission Editor */}
        <div className="py-4">
          <PermissionEditor
            userId={member.userId}
            projectId={projectId}
            currentPermissions={initialPermissions}
            onUpdate={handlePermissionUpdate}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MemberPermissionDialog;
