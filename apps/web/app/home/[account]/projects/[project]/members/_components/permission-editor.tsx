'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Label } from '@kit/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@kit/ui/use-toast';

import {
  FeaturePermission,
  PermissionTemplateName,
  PERMISSION_TEMPLATE_METADATA,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  PERMISSION_DESCRIPTIONS,
  detectTemplate,
  getTemplatePermissions,
  PermissionGroupKey,
} from '~/lib/permissions/types';

interface PermissionEditorProps {
  userId: string;
  projectId: string;
  currentPermissions: FeaturePermission[];
  onUpdate: (permissions: FeaturePermission[]) => void;
}

export function PermissionEditor({
  userId,
  projectId,
  currentPermissions,
  onUpdate,
}: PermissionEditorProps) {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<FeaturePermission[]>(
    () => [...currentPermissions]
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const currentTemplate = useMemo(() => detectTemplate(permissions), [permissions]);

  const hasPermission = useCallback(
    (permission: FeaturePermission) => permissions.includes(permission),
    [permissions]
  );

  const handleTemplateChange = useCallback((templateName: string) => {
    if (templateName === 'custom') return;
    const template = templateName as Exclude<PermissionTemplateName, 'custom'>;
    const newPermissions = getTemplatePermissions(template);
    setPermissions(newPermissions);
    setHasChanges(true);
  }, []);

  const handlePermissionToggle = useCallback(
    (permission: FeaturePermission, checked: boolean) => {
      setPermissions((prev) => {
        if (checked) {
          return prev.includes(permission) ? prev : [...prev, permission];
        } else {
          return prev.filter((p) => p !== permission);
        }
      });
      setHasChanges(true);
    },
    []
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/permissions/${userId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permissions }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update permissions');
      }

      const result = await response.json();

      toast({
        title: 'Permissions updated',
        description: 'Successfully updated permissions for this user.',
      });

      setHasChanges(false);
      onUpdate(result.permissions);
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to update permissions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [projectId, userId, permissions, toast, onUpdate]);

  const handleReset = useCallback(() => {
    setPermissions([...currentPermissions]);
    setHasChanges(false);
  }, [currentPermissions]);

  const templateOptions = useMemo(() => {
    return Object.entries(PERMISSION_TEMPLATE_METADATA).map(([key, metadata]) => ({
      value: key,
      label: metadata.name,
      description: metadata.description,
    }));
  }, []);

  const groupOrder: PermissionGroupKey[] = [
    'core',
    'analysis',
    'fieldOperations',
    'donors',
    'reports',
    'exports',
    'administrative',
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="template-select">Permission Template</Label>
        <Select value={currentTemplate} onValueChange={handleTemplateChange}>
          <SelectTrigger id="template-select" className="w-full">
            <SelectValue placeholder="Select a template..." />
          </SelectTrigger>
          <SelectContent>
            {templateOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </div>
              </SelectItem>
            ))}
            <SelectItem value="custom" disabled={currentTemplate !== 'custom'}>
              <div className="flex flex-col">
                <span className="font-medium">Custom</span>
                <span className="text-xs text-muted-foreground">
                  Custom permission selection
                </span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        {currentTemplate === 'custom' && (
          <p className="text-xs text-muted-foreground">
            Custom permission set ({permissions.length} permissions)
          </p>
        )}
      </div>

      <div className="space-y-6">
        {groupOrder.map((groupKey) => {
          const group = PERMISSION_GROUPS[groupKey];
          return (
            <div key={groupKey} className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground border-b pb-1">
                {group.label}
              </h4>
              <div className="grid gap-3">
                {group.permissions.map((permission) => (
                  <div
                    key={permission}
                    className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`permission-${permission}`}
                      checked={hasPermission(permission)}
                      onCheckedChange={(checked) =>
                        handlePermissionToggle(permission, checked === true)
                      }
                      className="mt-0.5"
                    />
                    <div className="flex flex-col space-y-0.5">
                      <Label
                        htmlFor={`permission-${permission}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {PERMISSION_LABELS[permission]}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {PERMISSION_DESCRIPTIONS[permission]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end space-x-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={!hasChanges || isSaving}
        >
          Reset
        </Button>
        <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
}

export default PermissionEditor;
