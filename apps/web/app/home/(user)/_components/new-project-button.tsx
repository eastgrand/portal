'use client';

import { Button } from '@kit/ui/button';
import { CreateProjectDialog } from '../../[account]/projects/_components/create-project-dialog';

export function NewProjectButton() {
  return (
    <CreateProjectDialog>
      <span onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}>
        <Button type="button" onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}>
          New Project
        </Button>
      </span>
    </CreateProjectDialog>
  );
}