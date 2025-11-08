import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Report } from '../database/entities/Report.entity';
import { Employee } from '../database/entities/Employee.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async create(createReportDto: CreateReportDto, generatedById?: number) {
    const data: any = {
      ...createReportDto,
      generated_by: generatedById || null,
    };

    const report = this.reportRepository.create(data);
    return await this.reportRepository.save(report);
  }

  async findAll(
    skip = 0,
    take = 10,
    type?: string,
    generatedById?: number,
    search?: string,
  ) {
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (generatedById) {
      where.generated_by = generatedById;
    }

    if (search) {
      where.title = ILike(`%${search}%`);
    }

    const [reports, total] = await Promise.all([
      this.reportRepository.find({
        where,
        skip,
        take,
        relations: ['generator'],
        order: { created_at: 'DESC' },
      }),
      this.reportRepository.count({ where }),
    ]);

    return {
      data: reports,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async findOne(id: number) {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: ['generator'],
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    return report;
  }

  async findByType(type: string, skip = 0, take = 10) {
    const [reports, total] = await Promise.all([
      this.reportRepository.find({
        where: { type },
        skip,
        take,
        relations: ['generator'],
        order: { created_at: 'DESC' },
      }),
      this.reportRepository.count({ where: { type } }),
    ]);

    return {
      data: reports,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async update(id: number, updateReportDto: UpdateReportDto) {
    const report = await this.reportRepository.findOne({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    await this.reportRepository.update({ id }, updateReportDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const report = await this.reportRepository.findOne({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    await this.reportRepository.delete({ id });

    return { message: 'Report deleted successfully' };
  }
}

