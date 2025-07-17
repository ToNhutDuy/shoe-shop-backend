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
    CreateAttributeValueDto,
    UpdateAttributeValueDto,
    CreateAttributeValueSchema,
    UpdateAttributeValueSchema,
} from '../schemas/product.schema';

import { AttributeService } from '../services/attribute.service';

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
@Controller('attribute-values')
export class AttributeValueController {
    private readonly logger = new Logger(AttributeValueController.name);

    constructor(
        private readonly attributeService: AttributeService,
    ) { }
    @Get('/all')
    @HttpCode(HttpStatus.OK)
    @Permissions([{ resource: Resource.products, action: [Action.read] }])
    async findAllAttributeValuesWithoutPagination(): Promise<AttributeValue[]> {
        this.logger.log('Received request to find all attribute values without pagination.');
        return this.attributeService.findAllAttributeValuesWithoutPagination();
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Permissions([{ resource: Resource.products, action: [Action.create] }])
    async createAttributeValue(@Body() createAttributeValueDto: CreateAttributeValueDto): Promise<AttributeValue> {
        this.logger.log('Received request to create attribute value.');
        return this.attributeService.createAttributeValue(createAttributeValueDto);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @Permissions([{ resource: Resource.products, action: [Action.read] }])
    async findAllAttributeValues(@Query() query: PaginationQueryDto): Promise<PaginatedResponse<AttributeValue>> {
        this.logger.log('Received request to find all attribute values.');
        return this.attributeService.findAllAttributeValues(query);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @Permissions([{ resource: Resource.products, action: [Action.read] }])
    async findAttributeValueById(@Param('id', ParseIntPipe) id: number): Promise<AttributeValue> {
        this.logger.log(`Received request to find attribute value by ID: ${id}`);
        return this.attributeService.findAttributeValueById(id);
    }

    @Put(':id')
    @HttpCode(HttpStatus.OK)
    @Permissions([{ resource: Resource.products, action: [Action.update] }])
    async updateAttributeValue(@Param('id', ParseIntPipe) id: number, @Body() updateAttributeValueDto: UpdateAttributeValueDto): Promise<AttributeValue> {
        this.logger.log(`Received request to update attribute value ID: ${id}`);
        return this.attributeService.updateAttributeValue(id, updateAttributeValueDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions([{ resource: Resource.products, action: [Action.delete] }])
    async deleteAttributeValue(@Param('id', ParseIntPipe) id: number): Promise<void> {
        this.logger.log(`Received request to delete attribute value ID: ${id}`);
        await this.attributeService.deleteAttributeValue(id);
    }
}