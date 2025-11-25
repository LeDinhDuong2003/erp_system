import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AssetRequestService } from './asset-request.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { RejectRequestDto } from './dto/reject-request.dto';
import { StartRequestDto } from './dto/start-request.dto';
import { CompleteRequestDto } from './dto/complete-request.dto';
import { QueryRequestsDto } from './dto/query-requests.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('requests')
@ApiBearerAuth('JWT-auth')
@Controller('requests')
@UseGuards(JwtAuthGuard)
export class AssetRequestController {
  constructor(private readonly service: AssetRequestService) {}

  // ✅ Các route KHÔNG có :id phải đặt TRƯỚC
  @Get('my-requests')
  @ApiOperation({ summary: 'Lấy danh sách yêu cầu của tôi' })
  getMyRequests(@Req() req, @Query() query: QueryRequestsDto) {
    return this.service.findMyRequests(req.user.id, query);
  }

  @Get('my-assets')
  @ApiOperation({ summary: 'Lấy danh sách tài sản đang giữ' })
  getMyAssets(@Req() req) {
    return this.service.getMyAssets(req.user.id);
  }

  // ✅ CHUYỂN LÊN ĐÂY - TRƯỚC :id
  @Get('statistics')
  @ApiOperation({ summary: 'Lấy thống kê yêu cầu' })
  getStats() {
    return this.service.getStatistics();
  }

  @Post()
  @ApiOperation({ summary: 'Tạo yêu cầu mới' })
  create(@Req() req, @Body() dto: CreateRequestDto) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả yêu cầu' })
  findAll(@Query() query: QueryRequestsDto) {
    return this.service.findAll(query);
  }

  // ✅ Route :id phải đặt SAU các route cụ thể
  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết yêu cầu' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Put(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @Body() dto: ApproveRequestDto, @Req() req) {
    return this.service.approve(id, dto, req.user.id);
  }

  @Put(':id/reject')
  reject(@Param('id', ParseIntPipe) id: number, @Body() dto: RejectRequestDto, @Req() req) {
    return this.service.reject(id, dto, req.user.id);
  }

  @Put(':id/start')
  start(@Param('id', ParseIntPipe) id: number, @Body() dto: StartRequestDto) {
    return this.service.start(id, dto, 0);
  }

  @Put(':id/complete')
  complete(@Param('id', ParseIntPipe) id: number, @Body() dto: CompleteRequestDto) {
    return this.service.complete(id, dto, 0);
  }
}

@ApiTags('notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly service: AssetRequestService) {}

  @Get('my-notifications')
  getMyNotifications(@Req() req) {
    return this.service.getMyNotifications(req.user.id);
  }

  @Get('unread-count')
  getUnreadCount(@Req() req) {
    return this.service.getUnreadCount(req.user.id);
  }

  @Put('mark-all-read')
  markAllRead(@Req() req) {
    return this.service.markAllAsRead(req.user.id);
  }

  // ✅ Route :id đặt cuối
  @Put(':id/mark-read')
  markAsRead(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.service.markAsRead(id, req.user.id);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.service.deleteNotification(id, req.user.id);
  }
}