// src/blog/services/blog-post.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';

import { BlogPost } from '../entities/blog-post.entity';
import { BlogCategory } from '../entities/blog-category.entity';
import { Tag } from '../entities/tag.entity';
import { BlogPostTag } from '../entities/blog-post-tag.entity';
import { BlogPostStatus, CreateBlogPostZodDto, UpdateBlogPostZodDto } from '../dto/blog-post.zod';
import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { slugify } from 'src/common/helpers/util';

@Injectable()
export class BlogPostService {
    private readonly logger = new Logger(BlogPostService.name);

    constructor(
        @InjectRepository(BlogPost)
        private readonly blogPostRepository: Repository<BlogPost>,
        @InjectRepository(BlogCategory)
        private readonly blogCategoryRepository: Repository<BlogCategory>,
        @InjectRepository(Tag)
        private readonly tagRepository: Repository<Tag>,
        @InjectRepository(BlogPostTag)
        private readonly blogPostTagRepository: Repository<BlogPostTag>,
    ) { }

    async createBlogPost(
        createBlogPostDto: CreateBlogPostZodDto,
        authorUserId: number,
    ): Promise<BlogPost> {
        const { blog_category_id, tag_ids, ...rest } = createBlogPostDto;

        const category = await this.blogCategoryRepository.findOne({ where: { id: blog_category_id } });
        if (!category) {
            throw new BadRequestException(`Danh mục với ID ${blog_category_id} không tồn tại.`);
        }

        const generatedSlug = slugify(createBlogPostDto.title);

        const existingPostBySlug = await this.blogPostRepository.findOne({ where: { slug: generatedSlug } });
        if (existingPostBySlug) {
            throw new ConflictException(`Slug '${generatedSlug}' đã tồn tại.`);
        }

        const newPost = this.blogPostRepository.create({
            ...rest,
            slug: generatedSlug,
            blog_category_id,
            author_user_id: authorUserId,
            published_at: createBlogPostDto.status === BlogPostStatus.PUBLISHED && !createBlogPostDto.published_at
                ? new Date()
                : createBlogPostDto.published_at ? new Date(createBlogPostDto.published_at) : null,
        });

        const savedPost: BlogPost = await this.blogPostRepository.save(newPost);

        // Handle tags
        if (tag_ids && tag_ids.length > 0) {
            await this.syncPostTags(savedPost.id, tag_ids);
            savedPost.blogPostTags = await this.blogPostTagRepository.find({
                where: { blog_post_id: savedPost.id },
                relations: ['tag'],
            });
        }

        this.logger.log(`Tạo bài viết blog mới thành công: "${savedPost.title}" (ID: ${savedPost.id})`);
        return savedPost;
    }

    async findAllBlogPosts(
        page: number = 1,
        limit: number = 10,
        search?: string,
        sort?: string,
        categoryId?: number,
        status?: BlogPostStatus,
    ): Promise<PaginatedResponse<BlogPost>> {
        const queryBuilder = this.blogPostRepository.createQueryBuilder('post')
            .leftJoinAndSelect('post.blogCategory', 'category')
            .leftJoinAndSelect('post.author', 'author')
            .leftJoinAndSelect('post.featuredImage', 'featuredImage')
            .leftJoinAndSelect('post.blogPostTags', 'blogPostTag')
            .leftJoinAndSelect('blogPostTag.tag', 'tag');

        if (search) {
            queryBuilder.where(
                'post.title ILIKE :search OR post.content_html ILIKE :search OR post.excerpt ILIKE :search',
                { search: `%${search}%` }
            );
        }
        if (categoryId) {
            queryBuilder.andWhere('post.blog_category_id = :categoryId', { categoryId });
        }
        if (status) {
            queryBuilder.andWhere('post.status = :status', { status });
        }

        // Xử lý sắp xếp
        if (sort) {
            const [field, order] = sort.split(':');
            const orderByField = {
                'id': 'post.id',
                'title': 'post.title',
                'slug': 'post.slug',
                'createdAt': 'post.created_at',
                'updatedAt': 'post.updated_at',
                'publishedAt': 'post.published_at',
                'viewCount': 'post.view_count',
            }[field] || 'post.created_at';

            queryBuilder.orderBy(orderByField, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
        } else {
            queryBuilder.orderBy('post.created_at', 'DESC');
        }

        const [posts, totalItems] = await queryBuilder
            .take(limit)
            .skip((page - 1) * limit)
            .getManyAndCount();

        const totalPages = Math.ceil(totalItems / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        return {
            data: posts,
            meta: {
                currentPage: page,
                itemCount: posts.length,
                itemsPerPage: limit,
                totalItems,
                totalPages,
                hasNextPage,
                hasPreviousPage,
            },
        };
    }

    async findOneBlogPost(identifier: number | string): Promise<BlogPost> {
        const whereClause = typeof identifier === 'number' ? { id: identifier } : { slug: identifier };
        const post = await this.blogPostRepository.findOne({
            where: whereClause,
            relations: ['blogCategory', 'author', 'featuredImage', 'blogPostTags', 'blogPostTags.tag'],
        });

        if (!post) {
            throw new NotFoundException(`Bài viết blog với ${typeof identifier === 'number' ? 'ID' : 'slug'} '${identifier}' không tìm thấy.`);
        }

        // Tăng view_count nếu bài viết được tìm thấy và chưa phải là draft
        if (post.status === BlogPostStatus.PUBLISHED) {
            post.view_count += 1;
            await this.blogPostRepository.save(post);
        }

        return post;
    }


    async updateBlogPost(id: number, updateBlogPostDto: UpdateBlogPostZodDto): Promise<BlogPost> {
        const post = await this.blogPostRepository.findOne({ where: { id } });
        if (!post) {
            throw new NotFoundException(`Bài viết blog với ID ${id} không tìm thấy.`);
        }

        const { blog_category_id, tag_ids, published_at, status, ...rest } = updateBlogPostDto;


        if (blog_category_id && blog_category_id !== post.blog_category_id) {
            const category = await this.blogCategoryRepository.findOne({ where: { id: blog_category_id } });
            if (!category) {
                throw new BadRequestException(`Danh mục với ID ${blog_category_id} không tồn tại.`);
            }
        }
        let finalSlug = slugify(updateBlogPostDto.title);

        if (finalSlug && finalSlug !== post.slug) {
            const existingPostBySlug = await this.blogPostRepository.findOne({ where: { slug: finalSlug, id: Not(id) } });
            if (existingPostBySlug) {
                throw new ConflictException(`Slug '${finalSlug}' đã tồn tại.`);
            }
        }

        let finalPublishedAt = post.published_at;
        if (status === BlogPostStatus.PUBLISHED && !post.published_at && !published_at) {
            finalPublishedAt = new Date();
        } else if (published_at !== undefined) {
            finalPublishedAt = published_at ? new Date(published_at) : null;
        }



        Object.assign(post, {
            ...rest,
            slug: finalSlug,
            blog_category_id,
            status,
            published_at: finalPublishedAt,
        });

        const updatedPost: BlogPost = await this.blogPostRepository.save(post);


        if (tag_ids !== undefined) {
            await this.syncPostTags(updatedPost.id, tag_ids);

            updatedPost.blogPostTags = await this.blogPostTagRepository.find({
                where: { blog_post_id: updatedPost.id },
                relations: ['tag'],
            });
        }

        this.logger.log(`Cập nhật bài viết blog ID ${id} thành công.`);
        return updatedPost;
    }


    async deleteBlogPost(id: number): Promise<void> {
        const post = await this.blogPostRepository.findOne({ where: { id } });
        if (!post) {
            throw new NotFoundException(`Bài viết blog với ID ${id} không tìm thấy.`);
        }

        await this.blogPostRepository.remove(post);
        this.logger.log(`Xóa bài viết blog ID ${id} thành công.`);
    }


    private async syncPostTags(blogPostId: number, newTagIds: number[]): Promise<void> {
        const existingTags = await this.blogPostTagRepository.find({ where: { blog_post_id: blogPostId } });
        const existingTagIds = new Set(existingTags.map(bt => bt.tag_id));

        const tagsToAdd: BlogPostTag[] = [];
        const tagsToRemoveIds: number[] = [];

        for (const tagId of newTagIds) {

            const tagExists = await this.tagRepository.findOne({ where: { id: tagId } });
            if (!tagExists) {
                this.logger.warn(`Tag with ID ${tagId} does not exist. Skipping association for blog post ${blogPostId}.`);
                continue;
            }

            if (!existingTagIds.has(tagId)) {
                tagsToAdd.push(this.blogPostTagRepository.create({ blog_post_id: blogPostId, tag_id: tagId }));
            } else {
                existingTagIds.delete(tagId);
            }
        }


        for (const tagId of existingTagIds) {

            const postTagToRemove = existingTags.find(bt => bt.tag_id === tagId && bt.blog_post_id === blogPostId);
            if (postTagToRemove) {
                tagsToRemoveIds.push(postTagToRemove.blog_post_id);

                await this.blogPostTagRepository.delete({ blog_post_id: blogPostId, tag_id: tagId });
            }
        }


        if (tagsToAdd.length > 0) {
            await this.blogPostTagRepository.save(tagsToAdd);
            this.logger.log(`Đã thêm ${tagsToAdd.length} thẻ mới cho bài viết ID ${blogPostId}.`);
        }

        if (tagsToRemoveIds.length > 0) {
            this.logger.log(`Đã xóa ${tagsToRemoveIds.length} mối quan hệ thẻ khỏi bài viết ID ${blogPostId}.`);
        }
    }


    async incrementViewCount(id: number): Promise<BlogPost> {
        const post = await this.blogPostRepository.findOne({ where: { id } });
        if (!post) {
            throw new NotFoundException(`Bài viết blog với ID ${id} không tìm thấy.`);
        }
        post.view_count += 1;
        return this.blogPostRepository.save(post);
    }
}
