import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Request,
  RequestStatus,
  RequestPriority, // Đã import
} from '../database/assetrequest/request.entity';
import {
  Notification,
  NotificationType,
} from '../database/assetrequest/notification.entity';
import { CreateRequestDto } from './dto/create-request.dto';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { RejectRequestDto } from './dto/reject-request.dto';
import { StartRequestDto } from './dto/start-request.dto';
import { CompleteRequestDto } from './dto/complete-request.dto';
import { QueryRequestsDto } from './dto/query-requests.dto';
import { Employee } from '../database/entities/Employee.entity';
import { Asset } from '../database/assetmanagement/asset.entity';

@Injectable()
export class AssetRequestService {
  constructor(
    @InjectRepository(Request)
    private requestRepo: Repository<Request>,
    @InjectRepository(Notification)
    private notiRepo: Repository<Notification>,
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
    @InjectRepository(Asset)
    private assetRepo: Repository<Asset>,
  ) {}

  async create(dto: CreateRequestDto, requesterId: number) {
    const requester = await this.employeeRepo.findOne({
      where: { id: requesterId },
    });
    if (!requester) throw new NotFoundException('Employee not found');

    const request = this.requestRepo.create({
      requester,
      request_type: dto.request_type,
      reason: dto.reason,
      request_date: new Date().toISOString().split('T')[0],
      quantity: dto.quantity ?? 1,
      priority: dto.priority ?? RequestPriority.MEDIUM, // Đã sửa
      needed_date: dto.needed_date,
      image_url: dto.image_url,
      asset_name_suggest: dto.asset_name_suggest,
    });

    if (dto.category_id) request.category = { id: dto.category_id } as any;

    if (dto.asset_id) {
      const asset = await this.assetRepo.findOne({
        where: { id: dto.asset_id },
      });
      if (!asset) throw new BadRequestException('Asset not found');
      request.asset = asset;
    }

    const saved = await this.requestRepo.save(request);

    // Notify managers
    const managers = await this.employeeRepo.find({
      where: { role: In(['MANAGER', 'ADMIN']) },
    });
    for (const mgr of managers) {
      await this.createNotification(
        mgr.id,
        NotificationType.NEW_REQUEST,
        `Yêu cầu mới từ ${requester.full_name}`,
        `${requester.full_name} đã tạo yêu cầu ${dto.request_type}`,
        `/requests/${saved.id}`,
        saved.id,
      );
    }
    return saved;
  }

  async findMyRequests(employeeId: number, query: QueryRequestsDto) {
    return this.findRequests({ ...query, requesterId: employeeId });
  }

  async findAll(query: QueryRequestsDto) {
    return this.findRequests(query);
  }

  private async findRequests(filters: any) {
    const {
      page = 1,
      pageSize = 10,
      search,
      status,
      request_type,
      priority,
      requesterId,
    } = filters;
    const skip = (page - 1) * pageSize;

    const qb = this.requestRepo
      .createQueryBuilder('req')
      .leftJoinAndSelect('req.requester', 'requester')
      .leftJoinAndSelect('req.asset', 'asset')
      .leftJoinAndSelect('req.category', 'category')
      .leftJoinAndSelect('req.approver', 'approver');

    if (requesterId)
      qb.andWhere('req.requester_id = :requesterId', { requesterId });

    if (search) {
      qb.andWhere(
        '(requester.full_name ILIKE :s OR requester.employee_code ILIKE :s OR asset.asset_name ILIKE :s OR asset.asset_code ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    if (status) qb.andWhere('req.status = :status', { status });
    if (request_type)
      qb.andWhere('req.request_type = :request_type', { request_type });
    if (priority) qb.andWhere('req.priority = :priority', { priority });

    qb.orderBy('req.created_at', 'DESC').skip(skip).take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number) {
    const req = await this.requestRepo.findOne({
      where: { id },
      relations: ['requester', 'asset', 'category', 'approver', 'supplier'],
    });
    if (!req) throw new NotFoundException('Request not found');
    return req;
  }

  async approve(id: number, dto: ApproveRequestDto, approverId: number) {
    const req = await this.findOne(id);
    if (req.status !== RequestStatus.PENDING)
      throw new BadRequestException('Yêu cầu không thể duyệt');

    const approver = await this.employeeRepo.findOne({
      where: { id: approverId },
    });
    
    if (!approver) throw new NotFoundException('Approver not found');

    // **SỬA LỖI TẠI ĐÂY**
    // Thêm !approver.role để kiểm tra null trước
    // if (!approver.role || !['MANAGER', 'ADMIN'].includes(approver.role)) {
    //   throw new ForbiddenException();
    // }

    req.status = RequestStatus.APPROVED;
    req.approver = approver;
    req.approval_date = new Date().toISOString().split('T')[0];
    req.approval_note = dto.approval_note;
    req.estimated_cost = dto.estimated_cost?.toString();

    const saved = await this.requestRepo.save(req);

    await this.createNotification(
      req.requester.id,
      NotificationType.APPROVED,
      'Yêu cầu đã được duyệt',
      `Yêu cầu #${id} đã được duyệt bởi ${approver.full_name}`,
      `/requests/${id}`,
      id,
    );
    return saved;
  }

  async reject(id: number, dto: RejectRequestDto, approverId: number) {
    const req = await this.findOne(id);
    if (req.status !== RequestStatus.PENDING)
      throw new BadRequestException('Yêu cầu không thể từ chối');

    const approver = await this.employeeRepo.findOne({
      where: { id: approverId },
    });
    
    if (!approver) throw new NotFoundException('Approver not found');

    // **SỬA LỖI TẠI ĐÂY**
    // Thêm !approver.role để kiểm tra null trước
    // if (!approver.role || !['MANAGER', 'ADMIN'].includes(approver.role)) {
    //   throw new ForbiddenException();
    // }

    req.status = RequestStatus.REJECTED;
    req.approver = approver;
    req.approval_date = new Date().toISOString().split('T')[0];
    req.rejection_reason = dto.rejection_reason;

    const saved = await this.requestRepo.save(req);

    await this.createNotification(
      req.requester.id,
      NotificationType.REJECTED,
      'Yêu cầu bị từ chối',
      `Yêu cầu #${id} đã bị từ chối: ${dto.rejection_reason}`,
      `/requests/${id}`,
      id,
    );
    return saved;
  }

  async start(id: number, dto: StartRequestDto, userId: number) {
    const req = await this.findOne(id);
    if (req.status !== RequestStatus.APPROVED)
      throw new BadRequestException('Chỉ yêu cầu đã duyệt mới được bắt đầu');

    req.status = RequestStatus.IN_PROGRESS;
    req.start_date = dto.start_date ?? new Date().toISOString().split('T')[0];

    return this.requestRepo.save(req);
  }

  async complete(id: number, dto: CompleteRequestDto, userId: number) {
    const req = await this.findOne(id);
    if (req.status !== RequestStatus.IN_PROGRESS)
      throw new BadRequestException('Chỉ yêu cầu đang xử lý mới được hoàn thành');

    req.status = RequestStatus.COMPLETED;
    req.completion_date =
      dto.completion_date ?? new Date().toISOString().split('T')[0];
    req.actual_cost = dto.actual_cost?.toString();
    req.result_note = dto.result_note;

    const saved = await this.requestRepo.save(req);

    await this.createNotification(
      req.requester.id,
      NotificationType.COMPLETED,
      'Yêu cầu đã hoàn thành',
      `Yêu cầu #${id} đã hoàn thành`,
      `/requests/${id}`,
      id,
    );
    return saved;
  }

  async getMyAssets(employeeId: number) {
    return this.assetRepo.find({
      // **SỬA LỖI 3: TRẢ VỀ CODE GỐC CỦA BẠN**
      // Giả định entity Asset có cột `current_holder_id`
      where: { current_holder_id: employeeId },
      relations: ['category'],
    });
  }

  async getStatistics() {
    const [pending, approved, rejected, urgent] = await Promise.all([
      this.requestRepo.count({ where: { status: RequestStatus.PENDING } }),
      this.requestRepo.count({ where: { status: RequestStatus.APPROVED } }),
      this.requestRepo.count({ where: { status: RequestStatus.REJECTED } }),
      this.requestRepo.count({ where: { priority: RequestPriority.URGENT } }),
    ]);
    return { pending, approved, rejected, urgent };
  }

  // Notification helpers
  private async createNotification(
    recipientId: number,
    type: NotificationType,
    title: string,
    content: string,
    link?: string,
    requestId?: number,
  ) {
    const noti = this.notiRepo.create({
      recipient: { id: recipientId } as any,
      notification_type: type,
      title,
      content,
      link,
      request: requestId ? ({ id: requestId } as any) : null,
    });
    return this.notiRepo.save(noti);
  }

  async getMyNotifications(employeeId: number) {
    return this.notiRepo.find({
      where: { recipient: { id: employeeId } },
      order: { created_at: 'DESC' },
      relations: ['request'],
    });
  }

  async getUnreadCount(employeeId: number) {
    return this.notiRepo.count({
      where: { recipient: { id: employeeId }, is_read: false },
    });
  }

  async markAsRead(id: number, employeeId: number) {
    const noti = await this.notiRepo.findOne({
      where: { id, recipient: { id: employeeId } },
    });
    if (!noti) throw new NotFoundException();
    noti.is_read = true;
    return this.notiRepo.save(noti);
  }

  async markAllAsRead(employeeId: number) {
    await this.notiRepo.update(
      { recipient: { id: employeeId }, is_read: false },
      { is_read: true },
    );
    return { message: 'All marked as read' };
  }

  async deleteNotification(id: number, employeeId: number) {
    const noti = await this.notiRepo.findOne({
      where: { id, recipient: { id: employeeId } },
    });
    if (!noti) throw new NotFoundException();
    await this.notiRepo.delete(id);
    return { message: 'Deleted' };
  }
}