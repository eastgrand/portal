/* eslint-disable @typescript-eslint/no-unsafe-call */
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTrigger } from '@kit/ui/dialog';
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
    } catch (error) {
      console.error('Error creating project:', error);
      // Handle error (show toast, etc.)
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <form action={handleCreateProject}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Project Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter project name"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create Project
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}