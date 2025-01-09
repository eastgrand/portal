'use client';

import { Button } from '@kit/ui/button';
import { CreateProjectDialog } from '../../[account]/projects/_components/create-project-dialog';
import { useState } from 'react';

export function NewProjectButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div>
      <CreateProjectDialog 
        isOpen={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        trigger={
          <Button 
            type="button" 
            data-test="new-project-button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDialogOpen(true);
            }}
          >
            New Project
          </Button>
        }
      />
    </div>
  );
}