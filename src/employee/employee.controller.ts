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
  BadRequestException,
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
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateEmployeeDto: UpdateEmployeeDto) {
    return this.employeeService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
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

  @Post(':id/unlock')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Unlock employee account (reset failed login attempts)' })
  @ApiResponse({ status: 200, description: 'Account unlocked successfully' })
  unlockAccount(@Param('id', ParseIntPipe) id: number) {
    return this.employeeService.unlockAccount(id);
  }

  @Patch(':id/two-factor')
  @ApiOperation({ summary: 'Update two-factor authentication setting' })
  @ApiResponse({ status: 200, description: '2FA setting updated successfully' })
  async updateTwoFactor(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { two_factor_enabled: boolean },
    @Request() req: any,
  ) {
    // Only allow users to update their own 2FA setting, or admins to update any
    const currentUserId = req.user?.id;
    if (currentUserId !== id) {
      // Check if user is admin
      const isAdmin = req.user?.roles?.some((r: any) => 
        r.code === 'SUPER_ADMIN' || r.name === 'Super Administrator'
      );
      if (!isAdmin) {
        throw new BadRequestException('You can only update your own 2FA setting');
      }
    }
    return this.employeeService.update(id, { two_factor_enabled: body.two_factor_enabled } as any);
  }
}

