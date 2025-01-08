'use client';

import { Button } from '@kit/ui/button';
import { CreateProjectDialog } from '../../[account]/projects/_components/create-project-dialog';
import { useCallback } from 'react';

export function NewProjectButton() {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Button clicked'); // Debug log
  }, []);

  return (
    <div onClick={handleClick}>
      <CreateProjectDialog>
        <Button type="button">
          New Project
        </Button>
      </CreateProjectDialog>
    </div>
  );
}