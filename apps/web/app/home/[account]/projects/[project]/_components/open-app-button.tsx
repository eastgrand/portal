'use client';

import { useState } from 'react';
import { Button } from '@kit/ui/button';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@kit/ui/use-toast';

interface OpenAppButtonProps {
  projectId: string;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * OpenAppButton Component
 *
 * Generates a project access token and redirects to the pol app.
 * The token allows secure cross-application authentication without
 * requiring the user to log in again.
 */
export function OpenAppButton({
  projectId,
  className,
  variant = 'default',
  size = 'default',
}: OpenAppButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleOpenApp = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/project-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate access token');
      }

      const { token } = await response.json();

      // Build the app URL with the token
      const appUrl = process.env.NEXT_PUBLIC_POL_APP_URL || 'http://localhost:3000';
      const targetUrl = new URL(appUrl);
      targetUrl.searchParams.set('project_token', token);

      // Redirect to the pol app
      window.location.href = targetUrl.toString();
    } catch (error) {
      console.error('Failed to open app:', error);
      toast({
        title: 'Error',
        description: error instanceof Error
          ? error.message
          : 'Failed to open the app. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleOpenApp}
      disabled={isLoading}
      className={className}
      variant={variant}
      size={size}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <ExternalLink className="mr-2 h-4 w-4" />
      )}
      {isLoading ? 'Opening...' : 'Open App'}
    </Button>
  );
}

export default OpenAppButton;
