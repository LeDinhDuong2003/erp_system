import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    ParseIntPipe,
    UseGuards,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { NotificationManagementService } from './notification-management.service';
  import {
    CreateNotificationSchemeDto,
    UpdateNotificationSchemeDto,
    CreateNotificationRuleDto,
    UpdateNotificationRuleDto,
    BulkAddRecipientsDto,
    BulkRemoveRecipientsDto,
    CloneNotificationSchemeDto,
  } from './dto/notification-management.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
  
  @Controller('notification-management')
  @UseGuards(JwtAuthGuard)
  export class NotificationManagementController {
    constructor(
      private readonly notificationManagementService: NotificationManagementService,
    ) {}
  
    // ==================== NOTIFICATION SCHEMES ====================
  
    /**
     * GET /notification-management/schemes
     * Lấy tất cả notification schemes
     */
    @Get('schemes')
    async getAllSchemes() {
      return this.notificationManagementService.getAllSchemes();
    }
  
    /**
     * GET /notification-management/schemes/:id
     * Lấy chi tiết một scheme
     */
    @Get('schemes/:id')
    async getSchemeById(@Param('id', ParseIntPipe) id: number) {
      return this.notificationManagementService.getSchemeById(id);
    }
  
    /**
     * POST /notification-management/schemes
     * Tạo notification scheme mới
     */
    @Post('schemes')
    @HttpCode(HttpStatus.CREATED)
    async createScheme(@Body() dto: CreateNotificationSchemeDto) {
      return this.notificationManagementService.createScheme(dto);
    }
  
    /**
     * PUT /notification-management/schemes/:id
     * Update notification scheme
     */
    @Put('schemes/:id')
    async updateScheme(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: UpdateNotificationSchemeDto,
    ) {
      return this.notificationManagementService.updateScheme(id, dto);
    }
  
    /**
     * DELETE /notification-management/schemes/:id
     * Xóa notification scheme
     */
    @Delete('schemes/:id')
    async deleteScheme(@Param('id', ParseIntPipe) id: number) {
      return this.notificationManagementService.deleteScheme(id);
    }
  
    /**
     * POST /notification-management/schemes/clone
     * Clone notification scheme
     */
    @Post('schemes/clone')
    @HttpCode(HttpStatus.CREATED)
    async cloneScheme(@Body() dto: CloneNotificationSchemeDto) {
      return this.notificationManagementService.cloneScheme(dto);
    }
  
    /**
     * GET /notification-management/schemes/:id/events
     * Lấy tất cả events trong scheme với recipients grouped
     */
    @Get('schemes/:id/events')
    async getSchemeEventsGrouped(@Param('id', ParseIntPipe) id: number) {
      return this.notificationManagementService.getSchemeEventsGrouped(id);
    }
  
    // ==================== NOTIFICATION EVENTS ====================
  
    /**
     * GET /notification-management/events
     * Lấy danh sách tất cả events có sẵn
     */
    @Get('events')
    async getAllAvailableEvents() {
      return this.notificationManagementService.getAllAvailableEvents();
    }
  
    /**
     * GET /notification-management/recipient-types
     * Lấy danh sách recipient types có sẵn
     */
    @Get('recipient-types')
    getAvailableRecipientTypes() {
      return this.notificationManagementService.getAvailableRecipientTypes();
    }
  
    /**
     * GET /notification-management/schemes/:schemeId/events/:eventName
     * Lấy notifications theo event name trong một scheme
     */
    @Get('schemes/:schemeId/events/:eventName')
    async getNotificationsByEvent(
      @Param('schemeId', ParseIntPipe) schemeId: number,
      @Param('eventName') eventName: string,
    ) {
      return this.notificationManagementService.getNotificationsByEvent(
        schemeId,
        decodeURIComponent(eventName),
      );
    }
  
    // ==================== NOTIFICATION RULES ====================
  
    /**
     * POST /notification-management/rules
     * Tạo notification rule mới (thêm recipient cho event)
     */
    @Post('rules')
    @HttpCode(HttpStatus.CREATED)
    async createNotificationRule(@Body() dto: CreateNotificationRuleDto) {
      return this.notificationManagementService.createNotificationRule(dto);
    }
  
    /**
     * PUT /notification-management/rules/:id
     * Update notification rule
     */
    @Put('rules/:id')
    async updateNotificationRule(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: UpdateNotificationRuleDto,
    ) {
      return this.notificationManagementService.updateNotificationRule(id, dto);
    }
  
    /**
     * DELETE /notification-management/rules/:id
     * Xóa notification rule (xóa recipient khỏi event)
     */
    @Delete('rules/:id')
    async deleteNotificationRule(@Param('id', ParseIntPipe) id: number) {
      return this.notificationManagementService.deleteNotificationRule(id);
    }
  
    /**
     * POST /notification-management/rules/bulk-add
     * Bulk add recipients to an event
     * Body: { notification_scheme_id, event_name, recipient_types: ['Reporter', 'Assignee'] }
     */
    @Post('rules/bulk-add')
    @HttpCode(HttpStatus.CREATED)
    async bulkAddRecipients(@Body() dto: BulkAddRecipientsDto) {
      return this.notificationManagementService.bulkAddRecipients(dto);
    }
  
    /**
     * POST /notification-management/rules/bulk-remove
     * Bulk remove recipients from an event
     * Body: { notification_scheme_id, event_name, recipient_types: ['Watcher'] }
     */
    @Post('rules/bulk-remove')
    @HttpCode(HttpStatus.OK)
    async bulkRemoveRecipients(@Body() dto: BulkRemoveRecipientsDto) {
      return this.notificationManagementService.bulkRemoveRecipients(dto);
    }
  
    // ==================== PROJECT ASSIGNMENTS ====================
  
    /**
     * PUT /notification-management/projects/:projectId/scheme
     * Assign notification scheme to project
     * Body: { notification_scheme_id }
     */
    @Put('projects/:projectId/scheme')
    async assignSchemeToProject(
      @Param('projectId', ParseIntPipe) projectId: number,
      @Body('notification_scheme_id', ParseIntPipe) schemeId: number,
    ) {
      return this.notificationManagementService.assignSchemeToProject(projectId, schemeId);
    }
  
    /**
     * GET /notification-management/schemes/:schemeId/projects
     * Get projects using a notification scheme
     */
    @Get('schemes/:schemeId/projects')
    async getProjectsUsingScheme(@Param('schemeId', ParseIntPipe) schemeId: number) {
      return this.notificationManagementService.getProjectsUsingScheme(schemeId);
    }
  
    // ==================== STATISTICS ====================
  
    /**
     * GET /notification-management/statistics
     * Get notification statistics
     */
    @Get('statistics')
    async getNotificationStatistics() {
      return this.notificationManagementService.getNotificationStatistics();
    }
  }