import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BlogsService } from './blogs.service';

@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) { }


}
