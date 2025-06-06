import { z } from 'zod';
import { CreateMediaSchema } from './create-media.dto';

export const UpdateMediaSchema = CreateMediaSchema.partial().extend({

});

export type UpdateMediaDto = z.infer<typeof UpdateMediaSchema>;