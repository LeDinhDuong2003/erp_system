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
  ParseBoolPipe,
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
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('departments')
@ApiBearerAuth('JWT-auth')
@Controller('departments')
@UseGuards(JwtAuthGuard)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create a new department' })
  @ApiBody({ type: CreateDepartmentDto })
  @ApiResponse({ status: 201, description: 'Department created successfully' })
  @ApiResponse({ status: 409, description: 'Department with this name already exists' })
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentService.create(createDepartmentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all departments' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name or description' })
  @ApiQuery({ name: 'includeChildren', required: false, type: Boolean, description: 'Include child departments' })
  @ApiResponse({ status: 200, description: 'List of departments' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
    @Query('includeChildren', new DefaultValuePipe(false), ParseBoolPipe) includeChildren?: boolean,
  ) {
    const skip = (page - 1) * pageSize;
    return this.departmentService.findAll(skip, pageSize, search, includeChildren);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get department tree structure' })
  @ApiResponse({ status: 200, description: 'Department tree' })
  getTree() {
    return this.departmentService.getTree();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department by ID' })
  @ApiParam({ name: 'id', description: 'Department ID', type: Number })
  @ApiQuery({ name: 'includeChildren', required: false, type: Boolean, description: 'Include child departments' })
  @ApiResponse({ status: 200, description: 'Department details' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeChildren', new DefaultValuePipe(false), ParseBoolPipe) includeChildren?: boolean,
  ) {
    return this.departmentService.findOne(id, includeChildren);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update department' })
  @ApiParam({ name: 'id', description: 'Department ID', type: Number })
  @ApiBody({ type: UpdateDepartmentDto })
  @ApiResponse({ status: 200, description: 'Department updated successfully' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDepartmentDto: UpdateDepartmentDto) {
    return this.departmentService.update(id, updateDepartmentDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Delete department' })
  @ApiParam({ name: 'id', description: 'Department ID', type: Number })
  @ApiResponse({ status: 200, description: 'Department deleted successfully' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete department with child departments' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.departmentService.remove(id);
  }

  @Get(':id/employees')
  @ApiOperation({ summary: 'Get employees in department and all child departments' })
  @ApiParam({ name: 'id', description: 'Department ID', type: Number })
  @ApiResponse({ status: 200, description: 'Employees retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  getEmployees(@Param('id', ParseIntPipe) id: number) {
    return this.departmentService.getEmployees(id);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get department statistics' })
  @ApiParam({ name: 'id', description: 'Department ID', type: Number })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  getStatistics(@Param('id', ParseIntPipe) id: number) {
    return this.departmentService.getStatistics(id);
  }
}

