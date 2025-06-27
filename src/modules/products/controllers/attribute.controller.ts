import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    Query,
    HttpCode,
    HttpStatus,
    ParseIntPipe,
    UsePipes,
    UseGuards,
    Logger
} from '@nestjs/common';

import {
    CreateAttributeDto,
    UpdateAttributeDto,
    CreateAttributeValueDto,
    UpdateAttributeValueDto,
    CreateAttributeSchema,
    UpdateAttributeSchema,
    CreateAttributeValueSchema,
    UpdateAttributeValueSchema,
} from '../schemas/product.schema';

import { AttributeService } from '../services/attribute.service';

import { Attribute } from '../entities/attribute.entity';
import { AttributeValue } from '../entities/attribute-value.entity';

import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { ZodValidationPipe } from 'src/common/pipe/zod-validation.pipe';
import { PaginationQueryDto, paginationQuerySchema } from 'src/common/dto/pagination-query.zod';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Resource } from '../../roles/enums/resource.enum';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Action } from '../../roles/enums/action.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attributes')
export class AttributeController {
    private readonly logger = new Logger(AttributeController.name);

    constructor(
        private readonly attributeService: AttributeService,
    ) { }


    @Get('/all')
    @HttpCode(HttpStatus.OK)
    @Permissions([{ resource: Resource.products, action: [Action.read] }])
    async findAllAttributesWithoutPagination(): Promise<Attribute[]> {
        this.logger.log('Received request to find all attributes without pagination.');
        return this.attributeService.findAllAttributesWithoutPagination();
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UsePipes(new ZodValidationPipe(CreateAttributeSchema))
    @Permissions([{ resource: Resource.products, action: [Action.create] }])
    async createAttribute(@Body() createAttributeDto: CreateAttributeDto): Promise<Attribute> {
        this.logger.log('Received request to create attribute.');
        return this.attributeService.createAttribute(createAttributeDto);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(paginationQuerySchema))
    @Permissions([{ resource: Resource.products, action: [Action.read] }])
    async findAllAttributes(@Query() query: PaginationQueryDto): Promise<PaginatedResponse<Attribute>> {
        this.logger.log('Received request to find all attributes.');
        return this.attributeService.findAllAttributes(query);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @Permissions([{ resource: Resource.products, action: [Action.read] }])
    async findAttributeById(@Param('id', ParseIntPipe) id: number): Promise<Attribute> {
        this.logger.log(`Received request to find attribute by ID: ${id}`);
        return this.attributeService.findAttributeById(id);
    }

    @Put(':id')
    @HttpCode(HttpStatus.OK)
    @Permissions([{ resource: Resource.products, action: [Action.update] }])
    async updateAttribute(@Param('id', ParseIntPipe) id: number, @Body() updateAttributeDto: any): Promise<any> {
        this.logger.log(`Received request to update attribute ID: ${id}`);
        return this.attributeService.updateAttribute(id, updateAttributeDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions([{ resource: Resource.products, action: [Action.delete] }])
    async deleteAttribute(@Param('id', ParseIntPipe) id: number): Promise<void> {
        this.logger.log(`Received request to delete attribute ID: ${id}`);
        await this.attributeService.deleteAttribute(id);
    }

    @Get(':attributeId/attribute-values')
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(paginationQuerySchema))
    @Permissions([{ resource: Resource.products, action: [Action.read] }])
    async findAttributeValuesByAttributeId(
        @Param('attributeId', ParseIntPipe) attributeId: number,
        @Query() query: PaginationQueryDto,
    ): Promise<PaginatedResponse<AttributeValue>> {
        this.logger.log(`Received request to find attribute values for attribute ID: ${attributeId}`);
        return this.attributeService.findAttributeValuesByAttributeId(attributeId, query);
    }
}