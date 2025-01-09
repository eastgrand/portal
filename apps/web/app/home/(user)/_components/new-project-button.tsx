'use client';

import { Button } from '@kit/ui/button';
import { CreateProjectDialog } from '../../[account]/projects/_components/create-project-dialog';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function NewProjectButton() {
  const router = useRouter();
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Block navigation
    router.push('#');
    console.log('Click intercepted');
  }, [router]);

  return (
    <div onClickCapture={handleClick}>
      <CreateProjectDialog>
        <div style={{ cursor: 'pointer' }} onClick={(e) => e.preventDefault()}>
          <Button type="button" onClick={(e) => e.preventDefault()}>
            New Project
          </Button>
        </div>
      </CreateProjectDialog>
    </div>
  );
}