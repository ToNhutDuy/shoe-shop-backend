// src/modules/promotions/services/promotion.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';

import { Promotion } from '../entities/promotion.entity';
import { PromotionApplicabilityRule } from '../entities/promotion-applicability-rule.entity';
import { CreatePromotionZodDto, UpdatePromotionZodDto, CreatePromotionApplicabilityRuleZodDto, UpdatePromotionApplicabilityRuleZodDto } from '../dto/promotion.zod';
import { PaginatedResponse } from 'src/common/dto/pagination.dto';

@Injectable()
export class PromotionService {
  private readonly logger = new Logger(PromotionService.name);

  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(PromotionApplicabilityRule)
    private readonly ruleRepository: Repository<PromotionApplicabilityRule>,
  ) { }


  async createPromotion(createPromotionDto: CreatePromotionZodDto): Promise<Promotion> {
    const { applicabilityRules, ...promotionData } = createPromotionDto;

    const existingPromotion = await this.promotionRepository.findOne({ where: { code: promotionData.code } });
    if (existingPromotion) {
      throw new ConflictException(`Mã giảm giá '${promotionData.code}' đã tồn tại.`);
    }
    const newPromotion = this.promotionRepository.create(promotionData);
    const savedPromotion: Promotion = await this.promotionRepository.save(newPromotion);

    if (applicabilityRules && applicabilityRules.length > 0) {
      const rules = applicabilityRules.map(ruleDto =>
        this.ruleRepository.create({ ...ruleDto, promotion_id: savedPromotion.id })
      );
      await this.ruleRepository.save(rules as PromotionApplicabilityRule[]);
      savedPromotion.applicabilityRules = rules;
    }

    this.logger.log(`Tạo mã giảm giá mới thành công: ${savedPromotion.code}`);
    return savedPromotion;
  }


  async findAllPromotions(
    page: number = 1,
    limit: number = 10,
    search?: string,
    sort?: string,
  ): Promise<PaginatedResponse<Promotion>> {
    const queryBuilder = this.promotionRepository.createQueryBuilder('promotion');

    if (search) {
      queryBuilder.where('promotion.code ILIKE :search OR promotion.description ILIKE :search', { search: `%${search}%` });
    }

    if (sort) {
      const [field, order] = sort.split(':');
      if (field && ['id', 'code', 'starts_at', 'ends_at', 'created_at'].includes(field)) {
        queryBuilder.orderBy(`promotion.${field}`, order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
      } else {
        this.logger.warn(`Invalid sort field: ${field}. Defaulting to 'created_at:desc'.`);
        queryBuilder.orderBy('promotion.created_at', 'DESC');
      }
    } else {
      queryBuilder.orderBy('promotion.created_at', 'DESC');
    }

    const [promotions, totalItems] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      data: promotions,
      meta: {
        currentPage: page,
        itemCount: promotions.length,
        itemsPerPage: limit,
        totalItems,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }


  async findOnePromotion(id: number): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({
      where: { id },
      relations: ['applicabilityRules'],
    });
    if (!promotion) {
      throw new NotFoundException(`Mã giảm giá với ID ${id} không tìm thấy.`);
    }
    return promotion;
  }


  async updatePromotion(id: number, updatePromotionDto: UpdatePromotionZodDto): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({ where: { id } });
    if (!promotion) {
      throw new NotFoundException(`Mã giảm giá với ID ${id} không tìm thấy.`);
    }

    const { applicabilityRules, ...promotionData } = updatePromotionDto;

    if (promotionData.code && promotionData.code !== promotion.code) {
      const existingPromotion = await this.promotionRepository.findOne({ where: { code: promotionData.code, id: Not(id) } });
      if (existingPromotion) {
        throw new ConflictException(`Mã giảm giá '${promotionData.code}' đã tồn tại.`);
      }
    }

    Object.assign(promotion, promotionData);
    const updatedPromotion: Promotion = await this.promotionRepository.save(promotion);


    if (applicabilityRules !== undefined) {

      const existingRules = await this.ruleRepository.find({ where: { promotion_id: id } });
      const existingRuleIds = new Set(existingRules.map(rule => rule.id));

      const rulesToSave: PromotionApplicabilityRule[] = [];
      const rulesToDeleteIds: number[] = [];

      for (const ruleDto of applicabilityRules) {
        if ('id' in ruleDto && ruleDto.id) {
          const existingRule = existingRules.find(r => r.id === ruleDto.id);
          if (existingRule) {
            Object.assign(existingRule, ruleDto);
            rulesToSave.push(existingRule);
            existingRuleIds.delete(ruleDto.id);
          } else {

            this.logger.warn(`Rule with ID ${ruleDto.id} provided for update, but not found for promotion ${id}. Treating as new.`);
            rulesToSave.push(this.ruleRepository.create({ ...ruleDto, promotion_id: id }) as PromotionApplicabilityRule);
          }
        } else {
          rulesToSave.push(this.ruleRepository.create({ ...ruleDto, promotion_id: id }) as PromotionApplicabilityRule);
        }
      }

      rulesToDeleteIds.push(...Array.from(existingRuleIds));

      if (rulesToDeleteIds.length > 0) {
        await this.ruleRepository.delete(rulesToDeleteIds);
        this.logger.log(`Xóa ${rulesToDeleteIds.length} quy tắc áp dụng cho mã giảm giá ID ${id}.`);
      }
      if (rulesToSave.length > 0) {
        await this.ruleRepository.save(rulesToSave);
        this.logger.log(`Lưu/cập nhật ${rulesToSave.length} quy tắc áp dụng cho mã giảm giá ID ${id}.`);
      }
      updatedPromotion.applicabilityRules = await this.ruleRepository.find({ where: { promotion_id: id } });
    }

    this.logger.log(`Cập nhật mã giảm giá ID ${id} thành công.`);
    return updatedPromotion;
  }

  async deletePromotion(id: number): Promise<void> {
    const promotion = await this.promotionRepository.findOne({ where: { id } });
    if (!promotion) {
      throw new NotFoundException(`Mã giảm giá với ID ${id} không tìm thấy.`);
    }


    await this.promotionRepository.remove(promotion);
    this.logger.log(`Xóa mã giảm giá ID ${id} thành công.`);
  }

  async togglePromotionActiveStatus(id: number, isActive: boolean): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({ where: { id } });
    if (!promotion) {
      throw new NotFoundException(`Mã giảm giá với ID ${id} không tìm thấy.`);
    }
    promotion.is_active = isActive;
    const updatedPromotion: Promotion = await this.promotionRepository.save(promotion);
    this.logger.log(`Cập nhật trạng thái mã giảm giá ID ${id} thành ${isActive ? 'active' : 'inactive'}.`);
    return updatedPromotion;
  }
}
