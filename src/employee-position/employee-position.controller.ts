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
import { EmployeePositionService } from './employee-position.service';
import { CreateEmployeePositionDto } from './dto/create-employee-position.dto';
import { UpdateEmployeePositionDto } from './dto/update-employee-position.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('employee-positions')
@ApiBearerAuth('JWT-auth')
@Controller('employee-positions')
@UseGuards(JwtAuthGuard)
export class EmployeePositionController {
  constructor(private readonly employeePositionService: EmployeePositionService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create a new employee position' })
  @ApiBody({ type: CreateEmployeePositionDto })
  @ApiResponse({ status: 201, description: 'Employee position created successfully' })
  @ApiResponse({ status: 404, description: 'Employee, department, or position not found' })
  create(@Body() createEmployeePositionDto: CreateEmployeePositionDto) {
    return this.employeePositionService.create(createEmployeePositionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all employee positions' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'employeeId', required: false, type: Number, description: 'Filter by employee ID' })
  @ApiResponse({ status: 200, description: 'List of employee positions' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('employeeId', new ParseIntPipe({ optional: true })) employeeId?: number,
  ) {
    const skip = (page - 1) * pageSize;
    return this.employeePositionService.findAll(skip, pageSize, employeeId);
  }

  @Get('current/:employeeId')
  @ApiOperation({ summary: 'Get current position of an employee' })
  @ApiParam({ name: 'employeeId', description: 'Employee ID', type: Number })
  @ApiResponse({ status: 200, description: 'Current employee position' })
  @ApiResponse({ status: 404, description: 'No current position found' })
  getCurrentPosition(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.employeePositionService.getCurrentPosition(employeeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee position by ID' })
  @ApiParam({ name: 'id', description: 'Employee position ID', type: Number })
  @ApiResponse({ status: 200, description: 'Employee position details' })
  @ApiResponse({ status: 404, description: 'Employee position not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.employeePositionService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Update employee position' })
  @ApiParam({ name: 'id', description: 'Employee position ID', type: Number })
  @ApiBody({ type: UpdateEmployeePositionDto })
  @ApiResponse({ status: 200, description: 'Employee position updated successfully' })
  @ApiResponse({ status: 404, description: 'Employee position not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateEmployeePositionDto: UpdateEmployeePositionDto) {
    return this.employeePositionService.update(id, updateEmployeePositionDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Delete employee position' })
  @ApiParam({ name: 'id', description: 'Employee position ID', type: Number })
  @ApiResponse({ status: 200, description: 'Employee position deleted successfully' })
  @ApiResponse({ status: 404, description: 'Employee position not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.employeePositionService.remove(id);
  }
}

