/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTeamAccountWorkspace } from '@kit/team-accounts/hooks/use-team-account-workspace';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { useToast } from '@kit/ui/use-toast';
import { CreateProjectSchema } from '../_lib/server/schema/create-project-schema';

interface CreateProjectDialogFormProps {
  onCreateProject?: () => void;
  onCancel?: () => void;
}

export function CreateProjectDialog(props: React.PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleCreateSuccess = () => {
    setIsOpen(false);
    toast({
      description: "Project created successfully",
      variant: "success",
    });
    router.refresh();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Create a new project for your team.
          </DialogDescription>
        </DialogHeader>
        <CreateProjectDialogForm
          onCancel={() => setIsOpen(false)}
          onCreateProject={handleCreateSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}

function CreateProjectDialogForm(props: CreateProjectDialogFormProps) {
  const {
    account: { id: accountId },
  } = useTeamAccountWorkspace();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const form = useForm({
    resolver: zodResolver(CreateProjectSchema),
    defaultValues: {
      name: '',
      accountId: accountId, // Make sure this matches the schema
    },
  });

  async function onSubmit(data: { name: string; accountId: string }) {
    startTransition(async () => {
      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message ?? 'Failed to create project');
        }

        props.onCreateProject?.();
      } catch (error) {
        console.error('Error creating project:', error);
        toast({
          description: error instanceof Error 
            ? error.message 
            : 'Failed to create project',
          variant: "destructive",
        });
      }
    });
  }

  return (
    <Form {...form}>
      <form
        className="flex flex-col space-y-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input
                  data-test="project-name-input"
                  placeholder="Enter project name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
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
          <Button 
            type="submit" 
            disabled={pending}
          >
            Create Project
          </Button>
        </div>
      </form>
    </Form>
  );
}