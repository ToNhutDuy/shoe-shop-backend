// src/blog/blog.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogCategory } from './entities/blog-category.entity';
import { BlogPost } from './entities/blog-post.entity';
import { BlogPostTag } from './entities/blog-post-tag.entity';
import { Tag } from './entities/tag.entity';
import { BlogCategoryService } from './services/blog-category.service';
import { BlogPostService } from './services/blog-post.service';
import { TagService } from './services/tag.service';
import { BlogCategoryController } from './controllers/blog-category.controller';
import { BlogPostController } from './controllers/blog-post.controller';
import { TagController } from './controllers/tag.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BlogCategory,
      BlogPost,
      BlogPostTag,
      Tag,
    ]),
    UsersModule
  ],
  controllers: [
    BlogCategoryController,
    BlogPostController,
    TagController,
  ],
  providers: [
    BlogCategoryService,
    BlogPostService,
    TagService,
  ],

  exports: [
    BlogCategoryService,
    BlogPostService,
    TagService,
  ],
})
export class BlogModule { }
