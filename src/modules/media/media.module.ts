import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from './entities/media.entity';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { UsersModule } from '../users/users.module';
import { MediaFolder } from './entities/media-folder.entity';
import { StorageModule } from 'src/common/helpers/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Media, MediaFolder]),
    forwardRef(() => UsersModule), StorageModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({

      }),
      inject: [ConfigService],
    }),

  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService, TypeOrmModule],
})
export class MediaModule { }