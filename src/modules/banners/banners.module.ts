// src/banner/banner.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Banner } from './entities/banner.entity';
import { MediaModule } from 'src/modules/media/media.module'; // Đảm bảo import MediaModule
import { BannerController } from './banners.controller';
import { BannerService } from './banners.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Banner]),
    MediaModule, // Import MediaModule để BannerService có thể sử dụng MediaService
    UsersModule
  ],
  controllers: [BannerController],
  providers: [BannerService],
  exports: [BannerService], // Export BannerService nếu các module khác cần sử dụng nó
})
export class BannerModule { }