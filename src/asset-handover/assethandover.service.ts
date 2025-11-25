import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial} from 'typeorm';
import { Assignment, AssignmentStatus } from '../database/assethandover/assignment.entity';
import { Asset, AssetStatus } from '../database/assetmanagement/asset.entity';
import { Employee } from '../database/entities/Employee.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ReturnAssignmentDto } from './dto/return-assignment.dto';

@Injectable()
export class AssetHandoverService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async findAll(
    page = 1,
    pageSize = 10,
    search?: string,
    employeeId?: number,
    status?: AssignmentStatus,
    sortBy = 'created_at',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    const skip = (page - 1) * pageSize;
    const qb = this.assignmentRepository.createQueryBuilder('a')
      .leftJoinAndSelect('a.asset', 'asset')
      .leftJoinAndSelect('a.employee', 'employee')
      .leftJoinAndSelect('a.assigned_by', 'assigned_by')
      .leftJoinAndSelect('a.returned_by', 'returned_by');

    if (search) {
      qb.andWhere(
        '(employee.full_name ILIKE :s OR asset.asset_code ILIKE :s OR asset.asset_name ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    if (employeeId) {
      qb.andWhere('employee.id = :employeeId', { employeeId });
    }
    if (status) {
      qb.andWhere('a.status = :status', { status });
    }

    qb.orderBy(`a.${sortBy}`, sortOrder);
    qb.skip(skip).take(pageSize);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number) {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
      relations: ['asset', 'employee', 'assigned_by', 'returned_by'],
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  async create(dto: CreateAssignmentDto, performedById?: number) {
    // check asset exists
    const asset = await this.assetRepository.findOne({ where: { id: dto.asset_id } });
    if (!asset) throw new BadRequestException('Asset not found');

    // check employee exists
    const employee = await this.employeeRepository.findOne({ where: { id: dto.employee_id } });
    if (!employee) throw new BadRequestException('Employee not found');

    // check asset is available (not currently assigned)
    // We consider asset.current_holder_id null or asset.status != IN_USE as available
    if (asset.current_holder_id) {
      throw new ConflictException('Tài sản đã được phân công cho người khác');
    }

    const assignmentDate = dto.assignment_date ?? new Date().toISOString().slice(0, 10);

    const assignedBy = performedById
      ? await this.employeeRepository.findOne({ where: { id: performedById } })
      : null;

    const entity = this.assignmentRepository.create({
      asset,
      employee,
      assignment_date: assignmentDate,
      assignment_reason: dto.assignment_reason ?? null,
      condition_on_assignment: dto.condition_on_assignment ?? null,
      status: AssignmentStatus.ASSIGNED,
      assigned_by: assignedBy ?? null,
    } as DeepPartial<Assignment>);

    // Save assignment
    const saved = await this.assignmentRepository.save(entity);

    // Update asset current holder and status
    asset.current_holder_id = employee.id;
    asset.current_assignment_date = assignmentDate;
    asset.status = AssetStatus.IN_USE;
    await this.assetRepository.save(asset);

    return saved;
  }

  async returnAssignment(id: number, dto: ReturnAssignmentDto, performedById?: number) {
    const assignment = await this.assignmentRepository.findOne({ where: { id }, relations: ['asset'] });
    if (!assignment) throw new NotFoundException('Assignment not found');

    if (assignment.status === AssignmentStatus.RETURNED) {
      throw new BadRequestException('Assignment already returned');
    }

    const returnDate = dto.return_date ?? new Date().toISOString().slice(0, 10);

    // Update assignment fields
    assignment.return_date = returnDate;
    assignment.return_reason = dto.return_reason ?? undefined;
    assignment.condition_on_return = dto.condition_on_return ?? undefined;
    assignment.status = AssignmentStatus.RETURNED;

    if (dto.returned_by_id) {
      const returnedBy = await this.employeeRepository.findOne({ where: { id: dto.returned_by_id } });
      if (returnedBy) assignment.returned_by = returnedBy;
    } else if (performedById) {
      const returnedBy = await this.employeeRepository.findOne({ where: { id: performedById } });
      if (returnedBy) assignment.returned_by = returnedBy;
    }

    const saved = await this.assignmentRepository.save(assignment);

    // Update asset: clear current holder and set status to AVAILABLE or appropriate
    const asset = assignment.asset;
    asset.current_holder_id = undefined;
    asset.current_assignment_date = undefined;

    // Optionally set asset.status to NEW or IN_USE->RETURNED logic; we'll set to NEW if previously IN_USE
    if (asset.status === AssetStatus.IN_USE) {
      asset.status = AssetStatus.NEW;
    }
    await this.assetRepository.save(asset);

    return saved;
  }

  async remove(id: number) {
    const assignment = await this.assignmentRepository.findOne({ where: { id } });
    if (!assignment) throw new NotFoundException('Assignment not found');

    // Business rule: allow delete only if returned OR allow admins only (handled by controller guards)
    if (assignment.status === AssignmentStatus.ASSIGNED) {
      throw new BadRequestException('Không thể xóa bàn giao đang đang sử dụng. Thu hồi trước khi xóa.');
    }

    await this.assignmentRepository.delete({ id });
    return { message: 'Assignment deleted' };
  }

  async findByEmployee(employeeId: number, page = 1, pageSize = 10, status?: AssignmentStatus) {
    const skip = (page - 1) * pageSize;
    const qb = this.assignmentRepository.createQueryBuilder('a')
      .leftJoinAndSelect('a.asset', 'asset')
      .leftJoinAndSelect('a.employee', 'employee')
      .where('employee.id = :employeeId', { employeeId });

    if (status) qb.andWhere('a.status = :status', { status });

    qb.orderBy('a.assignment_date', 'DESC');
    qb.skip(skip).take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findByAsset(assetId: number, page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize;
    const qb = this.assignmentRepository.createQueryBuilder('a')
      .leftJoinAndSelect('a.asset', 'asset')
      .leftJoinAndSelect('a.employee', 'employee')
      .where('asset.id = :assetId', { assetId })
      .orderBy('a.assignment_date', 'DESC')
      .skip(skip)
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async statistics() {
    // Simple statistics example - counts
    const totalAssigned = await this.assignmentRepository.count({ where: { status: AssignmentStatus.ASSIGNED } });
    const totalReturned = await this.assignmentRepository.count({ where: { status: AssignmentStatus.RETURNED } });

    // By category / department: needs joins (example by asset.category)
    const byCategory = await this.assignmentRepository.createQueryBuilder('a')
      .leftJoin('a.asset', 'asset')
      .leftJoin('asset.category', 'category')
      .select('category.category_name', 'category_name')
      .addSelect('COUNT(a.id)', 'count')
      .groupBy('category.category_name')
      .getRawMany();

    return {
      totalAssigned,
      totalReturned,
      byCategory,
    };
  }

  async getAvailableAssets(page = 1, pageSize = 10, search?: string, categoryId?: number) {
    const skip = (page - 1) * pageSize;
    const qb = this.assetRepository.createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .where('asset.current_holder_id IS NULL');

    if (search) {
      qb.andWhere('(asset.asset_name ILIKE :s OR asset.asset_code ILIKE :s)', { s: `%${search}%` });
    }
    if (categoryId) {
      qb.andWhere('category.id = :categoryId', { categoryId });
    }

    qb.orderBy('asset.created_at', 'DESC');
    qb.skip(skip).take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getCurrentHolder(assetId: number) {
    const asset = await this.assetRepository.findOne({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (!asset.current_holder_id) return null;
    const employee = await this.employeeRepository.findOne({ where: { id: asset.current_holder_id } });
    return employee;
  }

  async updateHolder(assetId: number, holderId?: number) {
    const asset = await this.assetRepository.findOne({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');

    if (holderId) {
      const emp = await this.employeeRepository.findOne({ where: { id: holderId } });
      if (!emp) throw new BadRequestException('Employee not found');
      asset.current_holder_id = emp.id;
      asset.status = AssetStatus.IN_USE;
      asset.current_assignment_date = new Date().toISOString().slice(0, 10);
    } else {
      // clear holder
      asset.current_holder_id = undefined;
      asset.current_assignment_date = undefined;
      asset.status = AssetStatus.NEW;
    }

    return this.assetRepository.save(asset);
  }
}