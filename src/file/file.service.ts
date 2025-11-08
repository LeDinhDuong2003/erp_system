import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { File } from '../database/entities/File.entity';
import { Employee } from '../database/entities/Employee.entity';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async create(createFileDto: CreateFileDto, uploadedById?: number) {
    // Verify employee exists if provided
    if (createFileDto.employee_id) {
      const employee = await this.employeeRepository.findOne({
        where: { id: createFileDto.employee_id },
      });

      if (!employee) {
        throw new NotFoundException('Employee not found');
      }
    }

    const data: any = {
      ...createFileDto,
      uploaded_by: uploadedById || createFileDto.employee_id || null,
      uploaded_at: new Date(),
    };

    const file = this.fileRepository.create(data);
    return await this.fileRepository.save(file);
  }

  async findAll(
    skip = 0,
    take = 10,
    employeeId?: number,
    category?: string,
    search?: string,
  ) {
    const where: any = {};

    if (employeeId) {
      where.employee_id = employeeId;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.file_name = ILike(`%${search}%`);
    }

    const [files, total] = await Promise.all([
      this.fileRepository.find({
        where,
        skip,
        take,
        relations: ['employee', 'uploader'],
        order: { uploaded_at: 'DESC' },
      }),
      this.fileRepository.count({ where }),
    ]);

    return {
      data: files,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async findOne(id: number) {
    const file = await this.fileRepository.findOne({
      where: { id },
      relations: ['employee', 'uploader'],
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }

    return file;
  }

  async findByEmployee(employeeId: number, category?: string) {
    const where: any = { employee_id: employeeId };

    if (category) {
      where.category = category;
    }

    const files = await this.fileRepository.find({
      where,
      relations: ['uploader'],
      order: { uploaded_at: 'DESC' },
    });

    return files;
  }

  async update(id: number, updateFileDto: UpdateFileDto) {
    const file = await this.fileRepository.findOne({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }

    // Verify employee exists if provided
    if (updateFileDto.employee_id) {
      const employee = await this.employeeRepository.findOne({
        where: { id: updateFileDto.employee_id },
      });

      if (!employee) {
        throw new NotFoundException('Employee not found');
      }
    }

    await this.fileRepository.update({ id }, updateFileDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const file = await this.fileRepository.findOne({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }

    await this.fileRepository.delete({ id });

    return { message: 'File deleted successfully' };
  }
}

