'use client';

import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { 
  Dialog, 
  DialogContent, 
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter
} from '@kit/ui/dialog';
import { Button } from '@kit/ui/button';
import { PropsWithChildren, useState } from 'react';
import { createProjectAction } from '../_lib/server/server-actions';

type ProjectRouteParams = {
  account: string;
};

export function CreateProjectDialog({ children }: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false);
  const params = useParams<ProjectRouteParams>();
  const router = useRouter();

  const handleCreateProject = async (formData: FormData) => {
    try {
      const name = formData.get('name') as string;
      const accountId = params.account;

      if (!accountId || typeof accountId !== 'string') {
        throw new Error('Valid account ID is required');
      }

      const project = await createProjectAction({
        name,
        accountId
      });

      // Close dialog and redirect to the new project
      setIsOpen(false);
      router.push(`/projects/${project.id}`);
      router.refresh(); // Refresh the current route
    } catch (error) {
      console.error('Error creating project:', error);
      // TODO: Show error toast
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new project in your workspace. Projects help you organize your work.
          </DialogDescription>
        </DialogHeader>
        
        <form action={handleCreateProject} className="space-y-4">
          <div>
            <label 
              htmlFor="name" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Project Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              required
              minLength={3}
              maxLength={50}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
              placeholder="Enter project name"
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}