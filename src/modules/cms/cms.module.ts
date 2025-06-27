import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CmsService } from './cms.service';
import { CmsController } from './cms.controller';
import { CmsPage } from './entities/cms-page.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CmsPage])], // Register the CmsPage entity with TypeORM
  controllers: [CmsController],
  providers: [CmsService],
  exports: [CmsService], // Export the service if other modules need to interact with CMS pages (e.g., linking in other content)
})
export class CmsModule { }