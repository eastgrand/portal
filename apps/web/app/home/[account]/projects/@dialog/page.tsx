'use client';

import { CreateProjectDialog } from '../_components/create-project-dialog';

export default function CreateProjectDialogRoute() {
  return (
    <CreateProjectDialog
      isOpen={true}
      onOpenChange={() => window.history.back()}
      trigger={null}
    />
  );
} 