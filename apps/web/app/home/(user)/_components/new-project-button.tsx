'use client';

import { Button } from '@kit/ui/button';
import { CreateProjectDialog } from '../../[account]/projects/_components/create-project-dialog';
import { useState, MouseEvent } from 'react';

export function NewProjectButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    // Only prevent default if this is triggered by a button click
    // This allows form submissions to still work
    if (e.target instanceof HTMLButtonElement) {
      e.preventDefault();
      setIsDialogOpen(true);
    }
  };

  return (
    <CreateProjectDialog 
      isOpen={isDialogOpen} 
      onOpenChange={setIsDialogOpen}
      trigger={
        <Button 
          type="button" 
          data-test="new-project-button"
          onClick={handleClick}
        >
          New Project
        </Button>
      }
    />
  );
}