import {
  Controller,
  Get,
  Query,
  Param,
  Post,
  Body,
  Patch,
  Delete,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AssetHandoverService } from './assethandover.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ReturnAssignmentDto } from './dto/return-assignment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AssignmentStatus } from '../database/assethandover/assignment.entity';

@ApiTags('assignments')
@ApiBearerAuth('JWT-auth')
@Controller('assignments')
@UseGuards(JwtAuthGuard)
export class AssetHandoverController {
  constructor(private readonly service: AssetHandoverService) {}

  // GET /api/assignments
  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
    @Query('employeeId') employeeId?: number,
    @Query('departmentId') departmentId?: number, // ← THÊM QUERY PARAM MỚI
    @Query('status') status?: AssignmentStatus,
    @Query('sortBy') sortBy = 'created_at',
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    return this.service.findAll(
      page, 
      pageSize, 
      search, 
      employeeId as any, 
      departmentId as any, // ← TRUYỀN VÀO SERVICE
      status as any, 
      sortBy, 
      sortOrder
    );
  }

  // GET /api/assignments/:id
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  // POST /api/assignments
  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  create(@Body() dto: CreateAssignmentDto, @Body('performedById') performedById?: number) {
    return this.service.create(dto, performedById);
  }

  // PUT /api/assignments/:id/return
  @Patch(':id/return')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  returnAssignment(@Param('id', ParseIntPipe) id: number, @Body() dto: ReturnAssignmentDto, @Body('performedById') performedById?: number) {
    return this.service.returnAssignment(id, dto, performedById);
  }

  // DELETE /api/assignments/:id
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(200)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  // GET /api/assignments/employee/:employeeId
  @Get('employee/:employeeId')
  getByEmployee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('status') status?: AssignmentStatus,
  ) {
    return this.service.findByEmployee(employeeId, page, pageSize, status as any);
  }

  // GET /api/assignments/asset/:assetId
  @Get('asset/:assetId')
  getByAsset(
    @Param('assetId', ParseIntPipe) assetId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
  ) {
    return this.service.findByAsset(assetId, page, pageSize);
  }

  // GET /api/assignments/statistics
  @Get('statistics')
  getStatistics() {
    return this.service.statistics();
  }

  // GET /api/assignments/assets/available
  @Get('assets/available')
  getAvailableAssets(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: number,
  ) {
    return this.service.getAvailableAssets(page, pageSize, search, categoryId as any);
  }

  // GET /api/assignments/assets/:id/current-holder
  @Get('assets/:id/current-holder')
  getCurrentHolder(@Param('id', ParseIntPipe) id: number) {
    return this.service.getCurrentHolder(id);
  }

  // PATCH /api/assignments/assets/:id/holder
  @Patch('assets/:id/holder')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  updateHolder(@Param('id', ParseIntPipe) id: number, @Body('holderId') holderId?: number) {
    return this.service.updateHolder(id, holderId);
  }
}