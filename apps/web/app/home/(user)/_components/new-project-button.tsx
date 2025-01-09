'use client';

import { Button } from '@kit/ui/button';
import { CreateProjectDialog } from '../../[account]/projects/_components/create-project-dialog';
import { useState } from 'react';

export function NewProjectButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <CreateProjectDialog 
      isOpen={isDialogOpen} 
      onOpenChange={setIsDialogOpen}
      trigger={
        <Button 
          type="button" 
          data-test="new-project-button"
          onClick={(e) => {
            // We need this to prevent the click from bubbling up 
            // and being treated as a navigation event
            if (e.target === e.currentTarget) {
              e.stopPropagation();
              setIsDialogOpen(true);
            }
          }}
        >
          New Project
        </Button>
      }
    />
  );
}