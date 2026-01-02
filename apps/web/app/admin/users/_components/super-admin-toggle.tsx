'use client';

import { useState } from 'react';

import { Switch } from '@kit/ui/switch';
import { useToast } from '@kit/ui/use-toast';

interface SuperAdminToggleProps {
  userId: string;
  initialValue: boolean;
  disabled?: boolean;
}

export function SuperAdminToggle({
  userId,
  initialValue,
  disabled = false,
}: SuperAdminToggleProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(initialValue);
  const { toast } = useToast();

  const handleToggle = async (checked: boolean) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}/super-admin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isSuperAdmin: checked }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update super admin status');
      }

      setIsSuperAdmin(checked);
      toast({
        title: 'Success',
        description: checked
          ? 'User has been granted super admin privileges'
          : 'Super admin privileges have been revoked',
      });
    } catch (error) {
      console.error('Error toggling super admin status:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to update super admin status',
        variant: 'destructive',
      });
      // Revert the optimistic update
      setIsSuperAdmin(!checked);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Switch
      checked={isSuperAdmin}
      onCheckedChange={handleToggle}
      disabled={disabled || isLoading}
      aria-label={`Toggle super admin status for user`}
    />
  );
}
