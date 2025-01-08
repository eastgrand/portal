'use client';

import { Button } from '@kit/ui/button';
import { CreateProjectDialog } from '../../[account]/projects/_components/create-project-dialog';
import Link from 'next/link';

export function NewProjectButton() {
  return (
    <Link href="#" passHref legacyBehavior>
      <CreateProjectDialog>
        <Button type="button">
          New Project
        </Button>
      </CreateProjectDialog>
    </Link>
  );
}