import {
    Controller,
    Get,
    Param,
    Query,
    ParseIntPipe,
    UseGuards,
  } from '@nestjs/common';
  import { StatisticsService } from './statistics.service';
  import { StatisticsQueryDto } from './dto/statistics-query.dto';
  import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
  
  @Controller('statistics')
  @UseGuards(JwtAuthGuard)
  export class StatisticsController {
    constructor(private readonly statisticsService: StatisticsService) {}
  
    // ==================== OVERALL PROJECT STATISTICS ====================
  
    /**
     * GET /statistics/projects/:projectId/overview
     * Lấy tổng quan thống kê của một project (bao gồm issues, epics, sprints, team)
     */
    @Get('projects/:projectId/overview')
    async getProjectOverview(
      @Param('projectId', ParseIntPipe) projectId: number,
      @Query() query: StatisticsQueryDto,
    ) {
      return this.statisticsService.getProjectOverallStatistics(
        projectId,
        query.start_date,
        query.end_date,
      );
    }
  
    // ==================== ISSUE STATISTICS ====================
  
    /**
     * GET /statistics/projects/:projectId/issues
     * Lấy thống kê chi tiết về issues
     */
    @Get('projects/:projectId/issues')
    async getIssueStatistics(
      @Param('projectId', ParseIntPipe) projectId: number,
      @Query() query: StatisticsQueryDto,
    ) {
      return this.statisticsService.getIssueStatistics(
        projectId,
        query.start_date,
        query.end_date,
      );
    }
  
    /**
     * GET /statistics/projects/:projectId/issues/trend
     * Lấy xu hướng issues theo thời gian (created vs resolved)
     */
    @Get('projects/:projectId/issues/trend')
    async getIssueTrend(
      @Param('projectId', ParseIntPipe) projectId: number,
      @Query('start_date') startDate: string,
      @Query('end_date') endDate: string,
    ) {
      if (!startDate || !endDate) {
        // Default to last 30 days if not provided
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        
        return this.statisticsService.getIssueTrend(
          projectId,
          start.toISOString().split('T')[0],
          end.toISOString().split('T')[0],
        );
      }
  
      return this.statisticsService.getIssueTrend(projectId, startDate, endDate);
    }
  
    // ==================== EPIC STATISTICS ====================
  
    /**
     * GET /statistics/projects/:projectId/epics
     * Lấy thống kê chi tiết về epics
     */
    @Get('projects/:projectId/epics')
    async getEpicStatistics(
      @Param('projectId', ParseIntPipe) projectId: number,
      @Query() query: StatisticsQueryDto,
    ) {
      return this.statisticsService.getEpicStatistics(
        projectId,
        query.start_date,
        query.end_date,
      );
    }
  
    // ==================== SPRINT STATISTICS ====================
  
    /**
     * GET /statistics/projects/:projectId/sprints
     * Lấy thống kê chi tiết về sprints
     */
    @Get('projects/:projectId/sprints')
    async getSprintStatistics(
      @Param('projectId', ParseIntPipe) projectId: number,
      @Query() query: StatisticsQueryDto,
    ) {
      return this.statisticsService.getSprintStatistics(
        projectId,
        query.start_date,
        query.end_date,
      );
    }
  
    // ==================== TEAM STATISTICS ====================
  
    /**
     * GET /statistics/projects/:projectId/team
     * Lấy thống kê về team members và contributors
     */
    @Get('projects/:projectId/team')
    async getTeamStatistics(@Param('projectId', ParseIntPipe) projectId: number) {
      return this.statisticsService.getTeamStatistics(projectId);
    }
  }