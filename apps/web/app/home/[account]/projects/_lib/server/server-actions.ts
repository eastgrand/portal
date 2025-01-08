'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getLogger } from '@kit/shared/logger';
import { enhanceAction } from '@kit/next/actions';
import { CreateProjectSchema } from './schema/create-project-schema';

export const createProjectAction = enhanceAction(
  async (data) => {
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
        throw insertError;
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
        throw memberError;
      }
      
      logger.info(
        {
          accountId: data.accountId,
          name: data.name,
          projectId: projectData.id,
        },
        'Project created successfully'
      );
      
      // Revalidate only the projects page layout
      revalidatePath('/home/[account]/projects', 'layout');
      
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
      
      throw error;
    }
  },
  {
    schema: CreateProjectSchema,
    auth: true,
  }
);