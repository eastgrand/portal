'use client';

import { Button } from '@kit/ui/button';
import { CreateProjectDialog } from '../../[account]/projects/_components/create-project-dialog';

export function NewProjectButton() {
  return (
    <CreateProjectDialog>
      <Button type="button" onClick={(e) => e.preventDefault()}>
        New Project
      </Button>
    </CreateProjectDialog>
  );
}