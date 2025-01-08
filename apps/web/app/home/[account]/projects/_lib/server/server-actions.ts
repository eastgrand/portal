'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getLogger } from '@kit/shared/logger';
import { enhanceAction } from '@kit/next/actions';
import { z } from 'zod';

const CreateProjectSchema = z.object({
  name: z.string().min(3).max(50),
  accountId: z.string()
});

type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const createProjectAction = enhanceAction(
  async (data: CreateProjectInput) => {
    const client = getSupabaseServerClient();
    const logger = await getLogger();
    
    try {
      logger.info(
        {
          accountId: data.accountId,
          name: data.name,
        },
        'Creating project...'
      );
      
      const { data: projectData, error: insertError } = await client
        .from('projects')
        .insert({
          account_id: data.accountId,
          name: data.name,
        })
        .select()
        .single();
      
      if (insertError) {
        logger.error(
          {
            accountId: data.accountId,
            name: data.name,
            error: insertError,
          },
          'Failed to create project'
        );
        throw new Error(insertError.message);
      }

      if (!projectData) {
        throw new Error('Failed to create project: No data returned');
      }
      
      // Add the creator as a project member
      const { data: { user }, error: userError } = await client.auth.getUser();
      
      if (userError) {
        logger.error({ error: userError }, 'Failed to get user');
        throw new Error('Failed to get user information');
      }

      if (!user?.id) {
        throw new Error('User not found');
      }

      const { error: memberError } = await client
        .from('project_members')
        .insert({
          project_id: projectData.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) {
        logger.error(
          {
            projectId: projectData.id,
            userId: user.id,
            error: memberError,
          },
          'Failed to add project member'
        );
        throw new Error('Failed to add project member');
      }
      
      logger.info(
        {
          accountId: data.accountId,
          name: data.name,
          projectId: projectData.id,
        },
        'Project created successfully'
      );
      
      // Revalidate paths using the correct structure
      revalidatePath('/home/projects');
      revalidatePath('/home/[account]/projects');
      revalidatePath(`/home/${data.accountId}/projects`);
      revalidatePath(`/home/${data.accountId}`);
      
      return projectData;
    } catch (error) {
      logger.error(
        {
          accountId: data.accountId,
          name: data.name,
          error,
        },
        'Failed to create project'
      );
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Failed to create project');
    }
  },
  {
    schema: CreateProjectSchema,
    auth: true,
  }
);