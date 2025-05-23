import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CmsService } from './cms.service';


@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) { }


}
