'use client';

import { Button } from '@kit/ui/button';
import { CreateProjectDialog } from '../../[account]/projects/_components/create-project-dialog';

export function NewProjectButton() {
  return (
    <CreateProjectDialog 
      trigger={
        <Button 
          type="button" 
          data-test="new-project-button"
        >
          New Project
        </Button>
      }
    />
  );
}