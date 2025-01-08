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
    
    logger.info(
      {
        accountId: data.accountId,
        name: data.name,
      },
      'Creating project...'
    );
    
    const response = await client
      .from('projects')
      .insert({
        account_id: data.accountId,
        name: data.name,
      });
    
    if (response.error) {
      logger.error(
        {
          accountId: data.accountId,
          name: data.name,
          error: response.error,
        },
        'Failed to create project'
      );
      throw response.error;
    }
    
    logger.info(
      {
        accountId: data.accountId,
        name: data.name,
      },
      'Project created'
    );
    
    revalidatePath('/home/[account]/projects', 'layout');
  },
  {
    schema: CreateProjectSchema,
    auth: true,
  }
);