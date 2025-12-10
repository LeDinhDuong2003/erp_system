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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { S3Service } from '../attendance/s3.service';

@ApiTags('employees')
@Controller('employees')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class EmployeeController {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly s3Service: S3Service,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeeService.create(createEmployeeDto);
  }

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
  ) {
    const skip = (page - 1) * pageSize;
    return this.employeeService.findAll(skip, pageSize, search);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.employeeService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateEmployeeDto: UpdateEmployeeDto) {
    return this.employeeService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.employeeService.remove(id);
  }

  @Post(':id/roles')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  assignRoles(@Param('id', ParseIntPipe) id: number, @Body() assignRolesDto: AssignRolesDto) {
    return this.employeeService.assignRoles(id, assignRolesDto);
  }

  @Delete(':id/roles')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  removeRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { role_ids: number[] },
  ) {
    return this.employeeService.removeRoles(id, body.role_ids);
  }

  @Post('avatar/presign-url')
  @ApiOperation({ summary: 'Generate presigned URL for avatar upload' })
  @ApiResponse({ status: 201, description: 'Presigned URL generated successfully' })
  async generateAvatarPresignUrl(
    @Request() req: any,
    @Body() body: { content_type: string },
  ) {
    const userId = req.user.id;
    return this.s3Service.generateAvatarUploadUrl(userId, body.content_type || 'image/jpeg');
  }
}

