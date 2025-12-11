import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { PositionService } from './position.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('positions')
@ApiBearerAuth('JWT-auth')
@Controller('positions')
@UseGuards(JwtAuthGuard)
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create a new position' })
  @ApiBody({ type: CreatePositionDto })
  @ApiResponse({ status: 201, description: 'Position created successfully' })
  @ApiResponse({ status: 409, description: 'Position with this title already exists' })
  create(@Body() createPositionDto: CreatePositionDto) {
    return this.positionService.create(createPositionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all positions' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by title or description' })
  @ApiQuery({ name: 'departmentId', required: false, type: Number, description: 'Filter by department ID' })
  @ApiResponse({ status: 200, description: 'List of positions' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
    @Query('departmentId', new ParseIntPipe({ optional: true })) departmentId?: number,
  ) {
    const skip = (page - 1) * pageSize;
    return this.positionService.findAll(skip, pageSize, search, departmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get position by ID' })
  @ApiParam({ name: 'id', description: 'Position ID', type: Number })
  @ApiResponse({ status: 200, description: 'Position details' })
  @ApiResponse({ status: 404, description: 'Position not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.positionService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update position' })
  @ApiParam({ name: 'id', description: 'Position ID', type: Number })
  @ApiBody({ type: UpdatePositionDto })
  @ApiResponse({ status: 200, description: 'Position updated successfully' })
  @ApiResponse({ status: 404, description: 'Position not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updatePositionDto: UpdatePositionDto) {
    return this.positionService.update(id, updatePositionDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Delete position' })
  @ApiParam({ name: 'id', description: 'Position ID', type: Number })
  @ApiResponse({ status: 200, description: 'Position deleted successfully' })
  @ApiResponse({ status: 404, description: 'Position not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.positionService.remove(id);
  }
}

