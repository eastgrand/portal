'use client';
import { useState, useTransition } from 'react';
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
 FormDescription,
 FormField,
 FormItem,
 FormLabel,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { CreateProjectSchema } from '../_lib/server/schema/create-project-schema';
import { createProjectAction } from '../_lib/server/server-actions';
export function CreateProjectDialog(props: React.PropsWithChildren) {
 const [isOpen, setIsOpen] = useState(false);
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
         onCreateProject={() => setIsOpen(false)}
       />
     </DialogContent>
   </Dialog>
 );
}
function CreateProjectDialogForm(props: {
 onCreateProject?: (name: string) => unknown;
 onCancel?: () => unknown;
}) {
 const {
   account: { id: accountId },
 } = useTeamAccountWorkspace();
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
       className={'flex flex-col space-y-4'}
       onSubmit={form.handleSubmit((data) => {
         startTransition(async () => {
           await createProjectAction(data);
         });
       })}
     >
       <FormField
         name={'name'}
         render={({ field }) => (
           <FormItem>
             <FormLabel>Project Name</FormLabel>
             <FormControl>
               <Input
                 data-test={'project-name-input'}
                 required
                 min={3}
                 max={50}
                 type={'text'}
                 placeholder={''}
                 {...field}
               />
             </FormControl>
             <FormDescription>Enter a name for your project (Ex. Accounting)</FormDescription>
           </FormItem>
         )}
       />
       <div className={'flex justify-end space-x-2'}>
         <Button variant={'outline'} type={'button'} onClick={props.onCancel}>
           Cancel
         </Button>
         <Button disabled={pending}>Create Project</Button>
       </div>
     </form>
   </Form>
 );
}