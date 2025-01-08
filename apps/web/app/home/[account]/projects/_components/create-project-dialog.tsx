'use client';

import { useParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { 
  Dialog, 
  DialogContent, 
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from '@kit/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Button } from '@kit/ui/button';
import { PropsWithChildren } from 'react';
import { createProjectAction } from '../_lib/server/server-actions';
import { CreateProjectSchema } from '../_lib/server/schema/create-project-schema';

type ProjectRouteParams = {
  account: string;
};

export function CreateProjectDialog({ children }: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Create a new project in your workspace.
          </DialogDescription>
        </DialogHeader>
        <CreateProjectDialogForm 
          onCancel={() => setIsOpen(false)}
          onCreateProject={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CreateProjectDialogForm(props: {
  onCreateProject?: () => void;
  onCancel?: () => void;
}) {
  const params = useParams<ProjectRouteParams>();
  const accountId = params.account;

  const form = useForm({
    resolver: zodResolver(CreateProjectSchema),
    defaultValues: {
      name: '',
      accountId,
    },
  });

  const [pending, startTransition] = useTransition();

  return (
    <Form {...form}>
      <form
        className="flex flex-col space-y-4"
        onSubmit={form.handleSubmit((data) => {
          startTransition(async () => {
            await createProjectAction(data);
            props.onCreateProject?.();
          });
        })}
      >
        <FormField
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input
                  data-test="project-name-input"
                  required
                  minLength={3}
                  maxLength={50}
                  type="text"
                  placeholder="Enter project name"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Enter a name for your project (Ex. Accounting)
              </FormDescription>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            type="button" 
            onClick={props.onCancel}
          >
            Cancel
          </Button>
          <Button disabled={pending}>
            Create Project
          </Button>
        </div>
      </form>
    </Form>
  );
}