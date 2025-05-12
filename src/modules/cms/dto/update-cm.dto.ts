import { PartialType } from '@nestjs/mapped-types';
import { CreateCmDto } from './create-cm.dto';

export class UpdateCmDto extends PartialType(CreateCmDto) {}
