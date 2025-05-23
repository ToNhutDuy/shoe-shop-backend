import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MediaService } from './media.service';
import { UpdateMediaDto } from './dto/update-media.dto';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) { }


}
