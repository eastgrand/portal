'use client';

import { CreateProjectDialog } from '../../_components/create-project-dialog';
import { useRouter } from 'next/navigation';

export default function CreateProjectDialogRoute() {
  const router = useRouter();
  
  return (
    <CreateProjectDialog
      isOpen={true}
      onOpenChange={() => router.back()}
      trigger={null}
    />
  );
} 