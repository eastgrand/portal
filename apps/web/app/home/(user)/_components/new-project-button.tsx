'use client';

import { Button } from '@kit/ui/button';
import { CreateProjectDialog } from '../../[account]/projects/_components/create-project-dialog';

export function NewProjectButton() {
  return (
    <CreateProjectDialog>
      <div style={{ cursor: 'pointer' }}>
        <Button type="button">
          New
        </Button>
      </div>
    </CreateProjectDialog>
  );
}