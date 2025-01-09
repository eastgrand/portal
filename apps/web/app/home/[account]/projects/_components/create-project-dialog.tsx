'use client';

import { useTeamAccountWorkspace } from '@kit/team-accounts/hooks/use-team-account-workspace';
import { useState, useTransition, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from '@kit/ui/dialog';
import { Button } from '@kit/ui/button';
import { PropsWithChildren } from 'react';
import { createProjectAction } from '../_lib/server/server-actions';

function CreateProjectDialogForm(props: {
  onCreateProject?: () => void;
  onCancel?: () => void;
}) {
  const {
    account: { id: accountId },
  } = useTeamAccountWorkspace();

  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        
        startTransition(async () => {
          await createProjectAction({
            name,
            accountId,
          });
          props.onCreateProject?.();
        });
      }}
    >
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

      <div className="flex justify-end space-x-2">
        <Button 
          variant="outline" 
          type="button" 
          onClick={props.onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          Create Project
        </Button>
      </div>
    </form>
  );
}

export function CreateProjectDialog(props: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    // When the component mounts, add a click listener to the button
    const button = document.querySelector('button');
    if (button) {
      const handleClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(true);
        console.log('Dialog opening, state:', isOpen);
      };
      
      button.addEventListener('click', handleClick);
      return () => button.removeEventListener('click', handleClick);
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {props.children}
      </DialogTrigger>
      {isOpen && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
          </DialogHeader>
          <CreateProjectDialogForm 
            onCancel={() => setIsOpen(false)}
            onCreateProject={() => setIsOpen(false)}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
