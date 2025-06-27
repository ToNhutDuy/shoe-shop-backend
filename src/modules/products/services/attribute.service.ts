import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, In, Like, DataSource } from 'typeorm';
import { Attribute } from '../entities/attribute.entity';
import { AttributeValue } from '../entities/attribute-value.entity';
import { CreateAttributeDto, UpdateAttributeDto, CreateAttributeValueDto, UpdateAttributeValueDto } from '../schemas/product.schema';
import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.zod';
import { ProductVariantAttributeValue } from '../entities/product-variant-attribute-value.entity';
import unidecode from 'unidecode';

@Injectable()
export class AttributeService {
    private readonly logger = new Logger(AttributeService.name);

    constructor(
        @InjectRepository(Attribute)
        private readonly attributeRepository: Repository<Attribute>,
        @InjectRepository(AttributeValue)
        private readonly attributeValueRepository: Repository<AttributeValue>,
        @InjectRepository(ProductVariantAttributeValue)
        private readonly productVariantAttributeValueRepository: Repository<ProductVariantAttributeValue>,

    ) { }


    async findAllAttributeValuesWithoutPagination(): Promise<AttributeValue[]> {
        return this.attributeValueRepository.find({
            relations: ['attribute'],
            order: { value: 'ASC' },
        });
    }



    async findAllAttributesWithoutPagination(): Promise<Attribute[]> {
        return this.attributeRepository.find({
            relations: ['attributeValues'],
            order: { name: 'ASC' },
        });
    }

    async createAttribute(createAttributeDto: CreateAttributeDto): Promise<Attribute> {

        const generatedSlug = unidecode(createAttributeDto.name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_.]/g, '');

        const existingAttributeByName = await this.attributeRepository.findOneBy({ name: createAttributeDto.name });
        if (existingAttributeByName) {
            this.logger.warn(`Attempted to create attribute with duplicate name: "${createAttributeDto.name}"`);
            throw new BadRequestException(`Attribute with name "${createAttributeDto.name}" already exists.`);
        }


        const existingAttributeBySlug = await this.attributeRepository.findOneBy({ slug: generatedSlug });
        if (existingAttributeBySlug) {
            this.logger.warn(`Attempted to create attribute with duplicate slug: "${generatedSlug}"`);
            throw new BadRequestException(`Attribute with slug "${generatedSlug}" already exists.`);
        }

        const attribute = this.attributeRepository.create({
            ...createAttributeDto,
            slug: generatedSlug,
        });

        const savedAttribute = await this.attributeRepository.save(attribute);
        this.logger.log(`Created attribute with ID: ${savedAttribute.id}, Name: "${savedAttribute.name}"`);
        return savedAttribute;
    }



    async findAllAttributes(query: PaginationQueryDto): Promise<PaginatedResponse<Attribute>> {
        const { current = 1, pageSize = 10, search, sort } = query;
        const skip = (current - 1) * pageSize;

        const queryBuilder = this.attributeRepository.createQueryBuilder('attribute')
            .leftJoinAndSelect('attribute.attributeValues', 'attributeValues');


        if (search) {
            const slug = unidecode(search).toLowerCase().replace(/\s+/g, '-');
            queryBuilder.andWhere(
                '(LOWER(attribute.name) LIKE LOWER(:search) OR LOWER(attribute.slug) LIKE LOWER(:slug))',
                { search: `%${search}%`, slug: `%${slug}%` }
            );
        }

        const allowedSortColumnsMap = {
            id: 'id',
            name: 'name',
            slug: 'slug',
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        };

        if (sort && sort.includes(':')) {
            const [sortBy, sortOrderRaw] = sort.split(':');
            const column = allowedSortColumnsMap[sortBy];
            const order: 'ASC' | 'DESC' = sortOrderRaw?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

            if (column) {
                queryBuilder.orderBy(`attribute.${column}`, order);
            } else {
                this.logger.warn(`Invalid sort column: "${sortBy}". Using default.`);
                queryBuilder.orderBy('attribute.created_at', 'ASC');
            }
        } else {
            queryBuilder.orderBy('attribute.created_at', 'ASC');
        }

        const [attributes, totalItems] = await queryBuilder
            .skip(skip)
            .take(pageSize)
            .getManyAndCount();

        const totalPages = Math.ceil(totalItems / pageSize);
        const itemCount = attributes.length;

        return {
            data: attributes,
            meta: {
                currentPage: current,
                itemCount,
                itemsPerPage: pageSize,
                totalItems,
                totalPages,
                hasNextPage: current < totalPages,
                hasPreviousPage: current > 1,
            },
        };
    }


    async findAttributeById(id: number): Promise<Attribute> {
        const attribute = await this.attributeRepository.findOne({
            where: { id },
            relations: ['attributeValues'],
        });
        if (!attribute) {
            throw new NotFoundException(`Attribute with ID ${id} not found`);
        }
        return attribute;
    }


    // Cập nhật Thuộc tính


    async updateAttribute(id: number, updateAttributeDto: UpdateAttributeDto): Promise<Attribute> {
        const attribute = await this.findAttributeById(id);

        let generatedSlug: string | undefined;

        // Nếu tên được cập nhật, tạo lại slug và kiểm tra tính duy nhất
        if (updateAttributeDto.name && updateAttributeDto.name !== attribute.name) {
            const existingAttributeByName = await this.attributeRepository.findOneBy({ name: updateAttributeDto.name });
            if (existingAttributeByName && existingAttributeByName.id !== id) {
                this.logger.warn(`Attempted to update attribute ID ${id} with duplicate name: "${updateAttributeDto.name}"`);
                throw new BadRequestException(`Attribute with name "${updateAttributeDto.name}" already exists.`);
            }
            generatedSlug = unidecode(updateAttributeDto.name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_.]/g, '');
            // Kiểm tra slug mới
            const existingAttributeBySlug = await this.attributeRepository.findOneBy({ slug: generatedSlug });
            if (existingAttributeBySlug && existingAttributeBySlug.id !== id) {
                this.logger.warn(`Attempted to update attribute ID ${id} with duplicate slug: "${generatedSlug}"`);
                throw new BadRequestException(`Attribute with slug "${generatedSlug}" already exists.`);
            }
            attribute.name = updateAttributeDto.name;
            attribute.slug = generatedSlug;
        }


        Object.assign(attribute, updateAttributeDto);

        const updatedAttribute = await this.attributeRepository.save(attribute);
        this.logger.log(`Updated attribute with ID: ${id}`);
        return updatedAttribute;
    }



    async deleteAttribute(id: number): Promise<void> {
        const associatedValuesCount = await this.attributeValueRepository.count({
            where: { attribute: { id } }
        });
        if (associatedValuesCount > 0) {
            throw new BadRequestException(`Không thể xóa thuộc tính với ID ${id} vì nó có ${associatedValuesCount} giá trị thuộc tính liên quan. Vui lòng xóa chúng trước.`);
        }

        const result = await this.attributeRepository.delete(id);
        if (result.affected === 0) {
            this.logger.warn(`Attempted to delete attribute ID ${id} but it was not found.`);
            throw new NotFoundException(`Attribute with ID ${id} not found`);
        }
        this.logger.log(`Deleted attribute with ID: ${id}`);
    }

    // Quản lý Giá trị Thuộc tính (Attribute Value)

    //Tạo Giá trị Thuộc tính Mới


    async createAttributeValue(createAttributeValueDto: CreateAttributeValueDto): Promise<AttributeValue> {
        const { attributeId, value, colorCode } = createAttributeValueDto;

        // Tự động tạo slug từ giá trị
        const generatedSlug = unidecode(value).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_.]/g, '');


        const attribute = await this.findAttributeById(attributeId);


        const existingValue = await this.attributeValueRepository.findOne({
            where: { attribute: { id: attributeId }, value },
        });
        if (existingValue) {
            this.logger.warn(`Attempted to create attribute value "${value}" with duplicate value for attribute ID ${attributeId}.`);
            throw new BadRequestException(`Attribute value "${value}" already exists for attribute ID ${attributeId}.`);
        }


        const existingValueBySlug = await this.attributeValueRepository.findOne({
            where: { attribute: { id: attributeId }, slug: generatedSlug },
        });
        if (existingValueBySlug) {
            this.logger.warn(`Attempted to create attribute value with duplicate slug: "${generatedSlug}" for attribute ID ${attributeId}.`);
            throw new BadRequestException(`Attribute value with slug "${generatedSlug}" already exists for attribute ID ${attributeId}.`);
        }

        const attributeValue = this.attributeValueRepository.create({
            attribute: attribute,
            value,
            color_code: colorCode,
            slug: generatedSlug,
        });

        const savedAttributeValue = await this.attributeValueRepository.save(attributeValue);
        this.logger.log(`Created attribute value with ID: ${savedAttributeValue.id}, Value: "${savedAttributeValue.value}" for attribute ID ${attributeId}`);
        return savedAttributeValue;
    }



    async findAllAttributeValues(query: PaginationQueryDto): Promise<PaginatedResponse<AttributeValue>> {
        const { current = 1, pageSize = 10, search, sort } = query;
        const skip = (current - 1) * pageSize;

        const queryBuilder = this.attributeValueRepository.createQueryBuilder('attributeValue')
            .leftJoinAndSelect('attributeValue.attribute', 'attribute'); // Load mối quan hệ attribute

        if (search) {
            const slug = unidecode(search).toLowerCase().replace(/\s+/g, '-');
            queryBuilder.andWhere(
                '(LOWER(attributeValue.value) LIKE LOWER(:search) OR LOWER(attributeValue.slug) LIKE LOWER(:slug))',
                { search: `%${search}%`, slug: `%${slug}%` }
            );
        }

        const allowedSortColumnsMap = {
            id: 'id',
            value: 'value',
            slug: 'slug',
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        };

        if (sort && sort.includes(':')) {
            const [sortBy, sortOrderRaw] = sort.split(':');
            const column = allowedSortColumnsMap[sortBy];
            const order: 'ASC' | 'DESC' = sortOrderRaw?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

            if (column) {
                queryBuilder.orderBy(`attributeValue.${column}`, order);
            } else {
                this.logger.warn(`Invalid sort column: "${sortBy}". Using default.`);
                queryBuilder.orderBy('attributeValue.created_at', 'ASC');
            }
        } else {
            queryBuilder.orderBy('attributeValue.created_at', 'ASC');
        }

        // Phân trang và truy vấn
        const [data, totalItems] = await queryBuilder
            .skip(skip)
            .take(pageSize)
            .getManyAndCount();

        const totalPages = Math.ceil(totalItems / pageSize);
        const itemCount = data.length;

        return {
            data,
            meta: {
                currentPage: current,
                itemCount,
                itemsPerPage: pageSize,
                totalItems,
                totalPages,
                hasNextPage: current < totalPages,
                hasPreviousPage: current > 1,
            },
        };
    }

    //Tìm Giá trị Thuộc tính theo ID Thuộc tính


    async findAttributeValuesByAttributeId(attributeId: number, query: PaginationQueryDto): Promise<PaginatedResponse<AttributeValue>> {
        const { current = 1, pageSize = 10, search } = query;
        const skip = (current - 1) * pageSize;

        const attribute = await this.attributeRepository.findOneBy({ id: attributeId });
        if (!attribute) {
            throw new NotFoundException(`Attribute with ID ${attributeId} not found.`);
        }

        const findOptions: FindManyOptions<AttributeValue> = {
            where: { attribute: { id: attributeId } },
            take: pageSize,
            skip: skip,
            relations: ['attribute'],
            order: { value: 'ASC' },
        };

        if (search) {

            findOptions.where = [
                { ...findOptions.where as object, value: Like(`%${search}%`) },
                { ...findOptions.where as object, slug: Like(`%${unidecode(search).toLowerCase().replace(/\s+/g, '-')}%`) },
            ];
        }

        const [attributeValues, totalItems] = await this.attributeValueRepository.findAndCount(findOptions);

        const totalPages = Math.ceil(totalItems / pageSize);
        const meta: PaginatedResponse<any>['meta'] = {
            currentPage: current,
            itemCount: attributeValues.length,
            itemsPerPage: pageSize,
            totalItems,
            totalPages,
            hasNextPage: current < totalPages,
            hasPreviousPage: current > 1,
        };

        return {
            data: attributeValues,
            meta,
        };
    }



    async findAttributeValueById(id: number): Promise<AttributeValue> {
        const attributeValue = await this.attributeValueRepository.findOne({
            where: { id },
            relations: ['attribute'],
        });
        if (!attributeValue) {
            throw new NotFoundException(`Attribute value with ID ${id} not found`);
        }
        return attributeValue;
    }


    async updateAttributeValue(id: number, updateAttributeValueDto: UpdateAttributeValueDto): Promise<AttributeValue> {
        const attributeValue = await this.findAttributeValueById(id);

        let targetAttributeId = attributeValue.attribute.id;
        let newGeneratedSlug: string | undefined;

        if (updateAttributeValueDto.attributeId && updateAttributeValueDto.attributeId !== attributeValue.attribute.id) {
            const newAttribute = await this.attributeRepository.findOneBy({ id: updateAttributeValueDto.attributeId });
            if (!newAttribute) {
                throw new NotFoundException(`New Attribute with ID ${updateAttributeValueDto.attributeId} not found.`);
            }
            attributeValue.attribute = newAttribute;
            targetAttributeId = newAttribute.id;
        }


        if (updateAttributeValueDto.value && updateAttributeValueDto.value !== attributeValue.value) {
            newGeneratedSlug = unidecode(updateAttributeValueDto.value).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_.]/g, '');

            const existingValue = await this.attributeValueRepository.findOne({
                where: {
                    attribute: { id: targetAttributeId },
                    value: updateAttributeValueDto.value,
                },
            });
            if (existingValue && existingValue.id !== id) {
                this.logger.warn(`Attempted to update attribute value ID ${id} with duplicate value: "${updateAttributeValueDto.value}" for attribute ID ${targetAttributeId}.`);
                throw new BadRequestException(`Attribute value "${updateAttributeValueDto.value}" already exists for this attribute.`);
            }

            const existingValueBySlug = await this.attributeValueRepository.findOne({
                where: {
                    attribute: { id: targetAttributeId },
                    slug: newGeneratedSlug,
                },
            });
            if (existingValueBySlug && existingValueBySlug.id !== id) {
                this.logger.warn(`Attempted to update attribute value ID ${id} with duplicate slug: "${newGeneratedSlug}" for attribute ID ${targetAttributeId}.`);
                throw new BadRequestException(`Attribute value with slug "${newGeneratedSlug}" already exists for this attribute.`);
            }
            attributeValue.value = updateAttributeValueDto.value;
            attributeValue.slug = newGeneratedSlug;
        }


        Object.assign(attributeValue, {
            color_code: updateAttributeValueDto.colorCode ?? attributeValue.color_code,
        });

        const updatedAttributeValue = await this.attributeValueRepository.save(attributeValue);
        this.logger.log(`Updated attribute value with ID: ${id}`);
        return updatedAttributeValue;
    }




    async deleteAttributeValue(id: number): Promise<void> {
        const associatedVariantCount = await this.productVariantAttributeValueRepository.count({
            where: { attributeValue: { id: id } }
        });

        if (associatedVariantCount > 0) {
            throw new BadRequestException(`Không thể xóa giá trị thuộc tính với ID ${id} vì nó được liên kết với ${associatedVariantCount} biến thể sản phẩm. Vui lòng gỡ bỏ các liên kết trước.`);
        }

        const result = await this.attributeValueRepository.delete(id);
        if (result.affected === 0) {
            this.logger.warn(`Attempted to delete attribute value ID ${id} but it was not found.`);
            throw new NotFoundException(`Attribute value with ID ${id} not found.`);
        }
        this.logger.log(`Deleted attribute value with ID: ${id}`);
    }



    async findAttributeValuesByIds(ids: number[]): Promise<AttributeValue[]> {
        return this.attributeValueRepository.find({
            where: { id: In(ids) },
            relations: ['attribute']
        });
    }
}