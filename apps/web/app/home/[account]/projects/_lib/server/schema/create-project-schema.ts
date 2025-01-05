import { z } from 'zod';

export const CreateProjectSchema = z.object({
  name: z.string().min(3).max(50),
  accountId: z.string()
});

export type CreateProject = z.infer<typeof CreateProjectSchema>; 