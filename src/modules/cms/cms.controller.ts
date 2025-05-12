import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CmsService } from './cms.service';
import { CreateCmDto } from './dto/create-cm.dto';
import { UpdateCmDto } from './dto/update-cm.dto';

@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Post()
  create(@Body() createCmDto: CreateCmDto) {
    return this.cmsService.create(createCmDto);
  }

  @Get()
  findAll() {
    return this.cmsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cmsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCmDto: UpdateCmDto) {
    return this.cmsService.update(+id, updateCmDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cmsService.remove(+id);
  }
}
