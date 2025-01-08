// Create a new file: '_components/new-project-button.tsx'
'use client';

import { Button } from '@kit/ui/button';
import { CreateProjectDialog } from '../../[account]/projects/_components/create-project-dialog';

export function NewProjectButton() {
  return (
    <CreateProjectDialog>
      <Button>New Project</Button>
    </CreateProjectDialog>
  );
}